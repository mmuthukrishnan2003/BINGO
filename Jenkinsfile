pipeline {

    /******************************************************
     * AGENT
     * Jenkins will execute this pipeline on any available agent.
     ******************************************************/
    agent any

    /******************************************************
     * PARAMETERS
     * These options appear in "Build with Parameters".
     ******************************************************/
    parameters {

        // Select the Git branch to deploy
        choice(
            name: 'BRANCH',
            choices: ['dev', 'preprod', 'main'],
            description: 'Select Git Branch'
        )

        // Select the deployment environment
        choice(
            name: 'ENVIRONMENT',
            choices: ['IND', 'US'],
            description: 'Select Deployment Environment'
        )
    }

    /******************************************************
     * ENVIRONMENT VARIABLES
     * Common values used throughout the pipeline.
     ******************************************************/
    environment {

        // GitHub Repository URL
        GIT_URL = 'https://github.com/mmuthukrishnan2003/BINGO.git'

        // Deployment Server IP
        SERVER_IP = '172.16.0.111'

        // SSH User for the server
        SERVER_USER = 'demo'

        // Jenkins Credentials ID
        // Manage Jenkins → Credentials → Global
        SSH_CREDENTIALS = 'ubuntu-server'

        // Docker Image Name
        IMAGE_NAME = 'demo/frontend'
    }

    stages {

        /******************************************************
         * STAGE 1 : SELECT ENVIRONMENT
         ******************************************************/
        stage('Select Environment') {

            steps {

                script {

                    /*
                     * Map the selected environment
                     * IND -> india namespace
                     * US  -> us namespace
                     */

                    if (params.ENVIRONMENT == 'IND') {
                        env.KUBE_NAMESPACE = 'india'
                    } else {
                        env.KUBE_NAMESPACE = 'us'
                    }

                    echo "=============================="
                    echo "Branch      : ${params.BRANCH}"
                    echo "Environment : ${params.ENVIRONMENT}"
                    echo "Namespace   : ${env.KUBE_NAMESPACE}"
                    echo "=============================="

                }

            }

        }

        /******************************************************
         * STAGE 2 : CHECKOUT SOURCE CODE
         ******************************************************/
        stage('Checkout Source') {

            steps {

                /*
                 * Download the selected Git branch.
                 */

                checkout([
                    $class: 'GitSCM',

                    branches: [[
                        name: "*/${params.BRANCH}"
                    ]],

                    userRemoteConfigs: [[
                        url: env.GIT_URL
                    ]]
                ])

            }

        }

        /******************************************************
         * STAGE 3 : BUILD DOCKER IMAGE
         ******************************************************/
        stage('Docker Build') {

            steps {

                /*
                 * Build Docker image.
                 */

                sh """

                docker build \
                -t ${IMAGE_NAME}:${BUILD_NUMBER} .

                """

            }

        }

        /******************************************************
         * STAGE 4 : DEPLOY TO SERVER
         ******************************************************/
        stage('Deploy') {

            steps {

                /*
                 * Use Jenkins SSH Credentials
                 */

                sshagent(credentials: [env.SSH_CREDENTIALS]) {

                    sh """

                    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '

                    echo "Connected Successfully"

                    cd /home/demo/project

                    git checkout ${params.BRANCH}

                    git pull origin ${params.BRANCH}

                    kubectl apply \
                    -n ${KUBE_NAMESPACE} \
                    -f kubernetes/

                    kubectl rollout restart deployment/frontend \
                    -n ${KUBE_NAMESPACE}

                    kubectl get pods \
                    -n ${KUBE_NAMESPACE}

                    '

                    """

                }

            }

        }

    }

    /******************************************************
     * POST ACTIONS
     ******************************************************/
    post {

        success {

            echo "Deployment Successful"

        }

        failure {

            echo "Deployment Failed"

        }

        always {

            echo "Pipeline Completed"

        }

    }

}
