// ============================================================================
// Jenkinsfile - CI/CD Pipeline
// ----------------------------------------------------------------------------
// Flow:
// Developer -> Git Push -> Merge Request -> Code Review -> Jenkins Trigger
//   -> Checkout -> Build -> Unit Test -> SonarQube -> Security Scan
//   -> Docker Build -> Docker Push -> Deploy DEV -> Health Check
//   -> QA Approval -> Deploy PREPROD -> Health Check -> Manager Approval
//   -> Deploy PROD -> Health Check -> Rollback (if required)
//   -> Slack / Email Notification
//
// NOTE: "Developer -> Git Push -> Merge Request -> Code Review" happen
// outside Jenkins (in Git/GitLab/GitHub). Jenkins picks up the flow from
// the "Jenkins Trigger" stage onward, normally via a webhook fired once
// the Merge Request is approved/merged.
// ============================================================================

pipeline {

    agent any

    // --------------------------------------------------------------------
    // Global tools & environment variables - adjust names/paths as per
    // your Jenkins Global Tool Configuration and organization standards.
    // --------------------------------------------------------------------
tools {
    jdk 'JDK-17'
}
    environment {
        DOCKER_REGISTRY   = 'registry.example.com'
        IMAGE_NAME        = 'my-app'
        IMAGE_TAG         = "${env.BUILD_NUMBER}"
        SONARQUBE_ENV     = 'MySonarQubeServer'      // Configured in Manage Jenkins > System
        SLACK_CHANNEL     = '#ci-cd-notifications'
        EMAIL_RECIPIENTS  = 'devops-team@example.com'
        DEV_NAMESPACE     = 'dev'
        PREPROD_NAMESPACE = 'preprod'
        PROD_NAMESPACE    = 'prod'
    }

    options {
        timestamps()                                  // Add timestamps to console log
        buildDiscarder(logRotator(numToKeepStr: '20')) // Keep last 20 builds
        disableConcurrentBuilds()                      // Avoid parallel pipeline runs
        timeout(time: 60, unit: 'MINUTES')             // Global pipeline timeout
    }

    triggers {
        // Jenkins Trigger: fires automatically when a Merge/Pull Request
        // is created or updated (configure webhook in Git provider).
        // Alternative: pollSCM('H/5 * * * *') if webhooks are unavailable.
        githubPush()
    }

    stages {

        // ------------------------------------------------------------------
        // STAGE: Checkout
        // Pulls the source code from the Git repository / branch that
        // triggered the build (post Code Review / Merge Request approval).
        // ------------------------------------------------------------------
        stage('Checkout') {
            steps {
                echo "Checking out source code..."
                checkout scm
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Build
        // Compiles the source code / installs dependencies and produces
        // build artifacts.
        // ------------------------------------------------------------------
        stage('Build') {
            steps {
                echo "Building application..."
                sh 'mvn clean compile'
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Unit Test
        // Runs automated unit tests and publishes test results/coverage.
        // ------------------------------------------------------------------
        stage('Unit Test') {
            steps {
                echo "Running unit tests..."
                sh 'mvn test'
            }
            post {
                always {
                    junit '**/target/surefire-reports/*.xml'
                }
            }
        }

        // ------------------------------------------------------------------
        // STAGE: SonarQube
        // Performs static code analysis for code quality, bugs, and
        // code smells; optionally waits for the Quality Gate result.
        // ------------------------------------------------------------------
        stage('SonarQube') {
            steps {
                echo "Running SonarQube analysis..."
                withSonarQubeEnv("${SONARQUBE_ENV}") {
                    sh 'mvn sonar:sonar'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Security Scan
        // Scans source code / dependencies / container images for known
        // vulnerabilities (e.g. Trivy, Snyk, OWASP Dependency-Check).
        // ------------------------------------------------------------------
        stage('Security Scan') {
            steps {
                echo "Running security scan..."
                sh 'dependency-check.sh --project my-app --scan . || true'
                // Replace with Trivy/Snyk/etc. as per your org's tooling
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Docker Build
        // Builds the Docker image for the application using the Dockerfile
        // in the repository root (adjust path as needed).
        // ------------------------------------------------------------------
        stage('Docker Build') {
            steps {
                echo "Building Docker image..."
                sh "docker build -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Docker Push
        // Pushes the built Docker image to the container registry.
        // ------------------------------------------------------------------
        stage('Docker Push') {
            steps {
                echo "Pushing Docker image to registry..."
                withCredentials([usernamePassword(credentialsId: 'docker-registry-creds',
                                                   usernameVariable: 'DOCKER_USER',
                                                   passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo \$DOCKER_PASS | docker login ${DOCKER_REGISTRY} -u \$DOCKER_USER --password-stdin
                        docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                    """
                }
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Deploy DEV
        // Deploys the newly built image to the DEV environment.
        // ------------------------------------------------------------------
        stage('Deploy DEV') {
            steps {
                echo "Deploying to DEV environment..."
                sh "kubectl set image deployment/my-app my-app=${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} -n ${DEV_NAMESPACE}"
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Health Check (DEV)
        // Verifies the DEV deployment is up and responding before
        // proceeding to QA Approval.
        // ------------------------------------------------------------------
        stage('Health Check - DEV') {
            steps {
                echo "Checking DEV environment health..."
                script {
                    def status = sh(script: "curl -s -o /dev/null -w '%{http_code}' https://dev.example.com/health", returnStdout: true).trim()
                    if (status != '200') {
                        error "DEV health check failed with status: ${status}"
                    }
                }
            }
        }

        // ------------------------------------------------------------------
        // STAGE: QA Approval
        // Manual gate - a QA engineer reviews the DEV deployment and
        // approves promotion to PREPROD.
        // ------------------------------------------------------------------
        stage('QA Approval') {
            steps {
                timeout(time: 24, unit: 'HOURS') {
                    input message: "QA: Approve promotion to PREPROD?", ok: 'Approve'
                }
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Deploy PREPROD
        // Deploys the image to the PREPROD (staging) environment.
        // ------------------------------------------------------------------
        stage('Deploy PREPROD') {
            steps {
                echo "Deploying to PREPROD environment..."
                sh "kubectl set image deployment/my-app my-app=${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} -n ${PREPROD_NAMESPACE}"
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Health Check (PREPROD)
        // Verifies the PREPROD deployment is healthy before requesting
        // Manager Approval for production release.
        // ------------------------------------------------------------------
        stage('Health Check - PREPROD') {
            steps {
                echo "Checking PREPROD environment health..."
                script {
                    def status = sh(script: "curl -s -o /dev/null -w '%{http_code}' https://preprod.example.com/health", returnStdout: true).trim()
                    if (status != '200') {
                        error "PREPROD health check failed with status: ${status}"
                    }
                }
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Manager Approval
        // Manual gate - final sign-off from a manager/release owner
        // before deploying to PRODUCTION.
        // ------------------------------------------------------------------
        stage('Manager Approval') {
            steps {
                timeout(time: 24, unit: 'HOURS') {
                    input message: "Manager: Approve deployment to PRODUCTION?", ok: 'Approve'
                }
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Deploy PROD
        // Deploys the image to the PRODUCTION environment.
        // ------------------------------------------------------------------
        stage('Deploy PROD') {
            steps {
                echo "Deploying to PRODUCTION environment..."
                sh "kubectl set image deployment/my-app my-app=${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} -n ${PROD_NAMESPACE}"
            }
        }

        // ------------------------------------------------------------------
        // STAGE: Health Check (PROD)
        // Final verification that PRODUCTION is healthy post-deployment.
        // If this fails, the 'Rollback' logic in post{} is triggered.
        // ------------------------------------------------------------------
        stage('Health Check - PROD') {
            steps {
                echo "Checking PRODUCTION environment health..."
                script {
                    def status = sh(script: "curl -s -o /dev/null -w '%{http_code}' https://prod.example.com/health", returnStdout: true).trim()
                    if (status != '200') {
                        error "PROD health check failed with status: ${status}"
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // POST-BUILD ACTIONS
    // Handles Rollback (only if a prior stage/health check failed) and
    // sends Slack / Email notifications for every build outcome.
    // ------------------------------------------------------------------
    post {

        // ROLLBACK: triggered automatically only when the pipeline
        // fails at or after the PROD deployment stage.
        failure {
            script {
                if (env.STAGE_NAME == 'Health Check - PROD' || env.STAGE_NAME == 'Deploy PROD') {
                    echo "Production failure detected - rolling back..."
                    sh "kubectl rollout undo deployment/my-app -n ${PROD_NAMESPACE}"
                }
            }
            slackSend(channel: "${SLACK_CHANNEL}", color: 'danger',
                      message: "❌ Pipeline FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER} at stage '${env.STAGE_NAME}'. ${env.BUILD_URL}")
            emailext(to: "${EMAIL_RECIPIENTS}",
                      subject: "FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                      body: "Pipeline failed at stage: ${env.STAGE_NAME}. Check console output: ${env.BUILD_URL}")
        }

        // SUCCESS: notify that the full pipeline (through PROD) succeeded.
        success {
            slackSend(channel: "${SLACK_CHANNEL}", color: 'good',
                      message: "✅ Pipeline SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER} deployed to PROD. ${env.BUILD_URL}")
            emailext(to: "${EMAIL_RECIPIENTS}",
                      subject: "SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                      body: "Pipeline completed successfully and deployed to PROD. ${env.BUILD_URL}")
        }

        // ALWAYS: runs regardless of outcome - good place for cleanup.
        always {
            echo "Pipeline finished with status: ${currentBuild.currentResult}"
            sh 'docker logout || true'
        }
    }
}
