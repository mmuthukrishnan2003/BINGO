pipeline {

    agent any

    /******************************************************
     * BUILD PARAMETERS
     ******************************************************/
    parameters {

        choice(
            name: 'BRANCH',
            choices: ['dev', 'preprod', 'main'],
            description: 'Select Git Branch'
        )

        choice(
            name: 'ENVIRONMENT',
            choices: ['IND', 'US'],
            description: 'Select Deployment Environment'
        )
    }

    /******************************************************
     * ENVIRONMENT VARIABLES
     ******************************************************/
    environment {

        // Git Repository
        GIT_URL = 'https://github.com/mmuthukrishnan2003/BINGO.git'

        // Deployment Server
        SERVER_IP = '172.16.0.111'
        SERVER_USER = 'demo'

        // Jenkins Credentials ID
        // Manage Jenkins -> Credentials -> Global
        SSH_CREDENTIALS = 'ubuntu-server'

        // Docker Image Name
        IMAGE_NAME = 'demo/frontend'

        // Namespace (will be set dynamically)
        KUBE_NAMESPACE = ''
    }

    stages {

        /******************************************************
         * SELECT NAMESPACE
         ******************************************************/
        stage('Select Environment') {

            steps {

                script {

                    if (params.ENVIRONMENT == 'IND') {
                        env.KUBE_NAMESPACE = 'india'
                    } else {
                        env.KUBE_NAMESPACE = 'us'
                    }

                    echo "====================================="
                    echo "Branch      : ${params.BRANCH}"
                    echo "Environment : ${params.ENVIRONMENT}"
                    echo "Namespace   : ${env.KUBE_NAMESPACE}"
                    echo "====================================="

                }

            }

        }

        /******************************************************
         * CHECKOUT SOURCE CODE
         ******************************************************/
        stage('Checkout') {

            steps {

                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "*/${params.BRANCH}"]],
                    userRemoteConfigs: [[
                        url: env.GIT_URL
                    ]]
                ])

            }

        }

        /******************************************************
         * BUILD DOCKER IMAGE
         ******************************************************/
        stage('Docker Build') {

            steps {

                sh """
                docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .
                """

            }

        }

        /******************************************************
         * DEPLOY TO SERVER
         ******************************************************/
        stage('Deploy') {

            steps {

                sshagent(credentials: [env.SSH_CREDENTIALS]) {

                    sh """
                    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << EOF

                    cd /home/demo/project

                    # Pull latest code
                    git checkout ${params.BRANCH}
                    git pull origin ${params.BRANCH}

                    # Deploy Kubernetes
                    kubectl apply -n ${KUBE_NAMESPACE} -f kubernetes/

                    # Restart Deployment
                    kubectl rollout restart deployment/frontend -n ${KUBE_NAMESPACE}

                    # Show Pods
                    kubectl get pods -n ${KUBE_NAMESPACE}

                    EOF
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
