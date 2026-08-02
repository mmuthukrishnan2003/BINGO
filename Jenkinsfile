// =====================================================================
// Jenkinsfile — GitLab -> Jenkins -> Docker -> SSH Deploy pipeline
// =====================================================================
// This file implements the flow:
//   Git Push -> GitLab (main/dev/preprod) -> Webhook -> Jenkins
//     -> Checkout -> Read Params -> Build -> Unit Tests -> SonarQube
//     -> Security Scan -> Docker Build -> Docker Push
//     -> SSH Deploy (pull, stop, remove, run) -> Health Check
//     -> Success: Slack/Email notify | Failed: Rollback + Notify
//
// It's written to be adapted, not copy-pasted blindly:
//   - Replace values in the `environment` block with your own.
//   - The pipeline assumes a Node/Java-style build (`npm`/`mvn`) — swap
//     the Build/Test stage commands for whatever your app uses.
//   - Credentials are referenced by ID (withCredentials / credentialsId).
//     Create matching entries in Jenkins > Manage Jenkins > Credentials.
// =====================================================================

pipeline {

    // Run on any available agent. Pin to a labeled agent (e.g. `docker`)
    // if you have a dedicated build node with Docker installed.
    agent any

    // -------------------------------------------------------------
    // PARAMETERS — populated from the GitLab webhook payload or set
    // manually when a human clicks "Build with Parameters".
    // -------------------------------------------------------------
    parameters {
        choice(
            name: 'DEPLOY_ENV',
            choices: ['dev', 'preprod', 'main'],
            description: 'Target environment / branch to deploy'
        )
        string(
            name: 'BRANCH_NAME',
            defaultValue: 'main',
            description: 'Git branch to checkout'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip unit tests (emergency hotfix only)'
        )
    }

    // -------------------------------------------------------------
    // GLOBAL ENVIRONMENT VARIABLES
    // -------------------------------------------------------------
    environment {
        // --- Git / GitLab ---
        GIT_REPO_URL       = 'git@gitlab.com:your-group/your-app.git'

        // --- Docker / Registry ---
        DOCKER_REGISTRY    = 'registry.example.com'
        IMAGE_NAME         = 'your-app'
        IMAGE_TAG          = "${env.BUILD_NUMBER}-${params.DEPLOY_ENV}"
        FULL_IMAGE         = "${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

        // --- Deployment target (per environment, resolved at runtime) ---
        DEPLOY_SERVER      = credentials('deploy-server-host')   // e.g. user@10.0.0.5, stored as Secret text
        CONTAINER_NAME     = "your-app-${params.DEPLOY_ENV}"
        HOST_PORT          = '8080'
        CONTAINER_PORT     = '8080'
        HEALTHCHECK_URL    = "http://localhost:${HOST_PORT}/health"

        // --- SonarQube ---
        SONAR_PROJECT_KEY  = 'your-app'

        // --- Credentials IDs (configured in Jenkins Credentials store) ---
        DOCKER_CREDS_ID    = 'docker-registry-creds'
        SSH_CREDS_ID       = 'deploy-server-ssh-key'
        SONAR_TOKEN_ID     = 'sonarqube-token'
        SLACK_CREDS_ID     = 'slack-webhook-url'
    }

    // Keep only the last 15 builds/artifacts to avoid disk bloat,
    // and timeout any single run that hangs (e.g. a stuck SSH session).
    options {
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
        ansiColor('xterm')
    }

    stages {

        // ===========================================================
        // STAGE 1: Checkout Code
        // Pulls the exact commit that triggered the webhook.
        // ===========================================================
        stage('Checkout Code') {
            steps {
                echo "Checking out branch: ${params.BRANCH_NAME}"
                git branch: "${params.BRANCH_NAME}",
                    url: "${env.GIT_REPO_URL}",
                    credentialsId: 'gitlab-ssh-key'
            }
        }

        // ===========================================================
        // STAGE 2: Read Parameters
        // Just surfaces what this run is doing, for audit/log clarity.
        // Real "reading" already happened via `parameters {}` above —
        // this stage is where you'd add extra validation logic.
        // ===========================================================
        stage('Read Parameters') {
            steps {
                script {
                    echo """
                    ==== Pipeline Run Parameters ====
                    Branch      : ${params.BRANCH_NAME}
                    Environment : ${params.DEPLOY_ENV}
                    Skip Tests  : ${params.SKIP_TESTS}
                    Image Tag   : ${env.IMAGE_TAG}
                    ==================================
                    """
                    // Example guardrail: refuse to deploy 'main' branch
                    // straight to 'dev' environment, etc. Customize as needed.
                    if (params.DEPLOY_ENV == 'main' && params.BRANCH_NAME != 'main') {
                        error("Refusing to deploy non-main branch to the main environment.")
                    }
                }
            }
        }

        // ===========================================================
        // STAGE 3: Build Application
        // Swap this block for your stack (mvn package, go build, etc.)
        // ===========================================================
        stage('Build Application') {
            steps {
                sh '''
                    echo "Installing dependencies and building..."
                    npm ci
                    npm run build
                '''
            }
        }

        // ===========================================================
        // STAGE 4: Run Unit Tests
        // Publishes JUnit-style results so Jenkins shows pass/fail
        // trends. Skippable via the SKIP_TESTS param for emergencies.
        // ===========================================================
        stage('Run Unit Tests') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                sh '''
                    echo "Running unit tests..."
                    npm test -- --ci --reporters=default --reporters=jest-junit
                '''
            }
            post {
                always {
                    junit testResults: '**/junit.xml', allowEmptyResults: true
                }
            }
        }

        // ===========================================================
        // STAGE 5: SonarQube Analysis
        // Static code quality/coverage scan. Waits for the Quality
        // Gate webhook result before letting the pipeline continue.
        // ===========================================================
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQubeServer') {
                    sh """
                        sonar-scanner \
                          -Dsonar.projectKey=${env.SONAR_PROJECT_KEY} \
                          -Dsonar.sources=. \
                          -Dsonar.login=\$SONAR_TOKEN
                    """
                }
            }
        }
        stage('Quality Gate') {
            steps {
                // Fails the build automatically if Sonar's Quality Gate fails.
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ===========================================================
        // STAGE 6: Security Scan
        // Example uses Trivy against the filesystem/deps. Swap for
        // Snyk, OWASP Dependency-Check, etc. Fails on HIGH/CRITICAL.
        // ===========================================================
        stage('Security Scan') {
            steps {
                sh '''
                    echo "Running dependency & filesystem security scan..."
                    trivy fs --severity HIGH,CRITICAL --exit-code 1 .
                '''
            }
        }

        // ===========================================================
        // STAGE 7: Docker Build
        // ===========================================================
        stage('Docker Build') {
            steps {
                echo "Building image ${env.FULL_IMAGE}"
                sh "docker build -t ${env.FULL_IMAGE} ."
            }
        }

        // ===========================================================
        // STAGE 8: Docker Push
        // Logs into the registry with stored credentials, pushes,
        // then logs out so the token doesn't linger on the agent.
        // ===========================================================
        stage('Docker Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: env.DOCKER_CREDS_ID,
                    usernameVariable: 'REG_USER',
                    passwordVariable: 'REG_PASS'
                )]) {
                    sh """
                        echo "\$REG_PASS" | docker login ${env.DOCKER_REGISTRY} -u "\$REG_USER" --password-stdin
                        docker push ${env.FULL_IMAGE}
                        docker logout ${env.DOCKER_REGISTRY}
                    """
                }
            }
        }

        // ===========================================================
        // STAGE 9: SSH to Deployment Server + Deploy
        // Pulls the new image, stops/removes the old container, runs
        // the new one, then waits and checks health.
        // The heavy lifting lives in scripts/deploy.sh (see below) so
        // this stage stays short and the logic is testable/reusable.
        // ===========================================================
        stage('Deploy to Server') {
            steps {
                sshagent(credentials: [env.SSH_CREDS_ID]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${env.DEPLOY_SERVER} '
                            bash -s' < scripts/deploy.sh \
                            ${env.FULL_IMAGE} \
                            ${env.CONTAINER_NAME} \
                            ${env.HOST_PORT} \
                            ${env.CONTAINER_PORT}
                    """
                }
            }
        }

        // ===========================================================
        // STAGE 10: Health Check
        // Polls the app's /health endpoint after deploy. If it never
        // returns 200 within the timeout, mark this stage (and thus
        // the pipeline) as FAILED so the post{} block can roll back.
        // ===========================================================
        stage('Health Check') {
            steps {
                sshagent(credentials: [env.SSH_CREDS_ID]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${env.DEPLOY_SERVER} '
                            for i in \$(seq 1 10); do
                                if curl -sf ${env.HEALTHCHECK_URL} > /dev/null; then
                                    echo "Health check passed"
                                    exit 0
                                fi
                                echo "Waiting for app to become healthy... (\$i/10)"
                                sleep 5
                            done
                            echo "Health check failed after 10 attempts"
                            exit 1
                        '
                    """
                }
            }
        }
    }

    // ===============================================================
    // POST — runs after all stages, regardless of outcome.
    //   success -> notify success (Slack/email)
    //   failure -> rollback the deployment, then notify failure
    // This is what implements the branch at the bottom of the diagram.
    // ===============================================================
    post {
        success {
            echo "Pipeline succeeded — notifying team."
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "✅ *${env.JOB_NAME}* #${env.BUILD_NUMBER} deployed to *${params.DEPLOY_ENV}* successfully.\n${env.FULL_IMAGE}"
            )
            emailext(
                to: 'devops-team@example.com',
                subject: "SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Deployment of ${env.FULL_IMAGE} to ${params.DEPLOY_ENV} succeeded."
            )
        }

        failure {
            echo "Pipeline failed — attempting automatic rollback."
            script {
                sshagent(credentials: [env.SSH_CREDS_ID]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${env.DEPLOY_SERVER} '
                            bash -s' < scripts/rollback.sh ${env.CONTAINER_NAME}
                    """
                }
            }
            slackSend(
                channel: '#deployments',
                color: 'danger',
                message: "❌ *${env.JOB_NAME}* #${env.BUILD_NUMBER} failed for *${params.DEPLOY_ENV}*. Rolled back to previous container. Check Jenkins logs."
            )
            emailext(
                to: 'devops-team@example.com',
                subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Deployment of ${env.FULL_IMAGE} to ${params.DEPLOY_ENV} failed and was rolled back. See: ${env.BUILD_URL}"
            )
        }

        // Always clean the workspace and dangling local images so the
        // Jenkins agent's disk doesn't fill up over time.
        always {
            sh 'docker image prune -f || true'
            cleanWs()
        }
    }
}
