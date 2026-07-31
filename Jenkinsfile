pipeline {

    agent any

    environment {

        // GitHub Repository
        GIT_URL = 'https://github.com/mmuthukrishnan2003/BINGO.git'

        // Fixed Branch
        GIT_BRANCH = 'main'

        // Deployment Server
        SERVER_IP = '172.16.0.111'
        SERVER_USER = 'demo'

        // Jenkins SSH Credentials ID
        SSH_CREDENTIALS = 'ubuntu-server'

        // Docker Image
        IMAGE_NAME = 'demo/frontend'

        // Kubernetes Namespace
        KUBE_NAMESPACE = 'india'
    }

    stages {

        stage('Checkout Source') {

            steps {

                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "*/${env.GIT_BRANCH}"]],
                    userRemoteConfigs: [[
                        url: env.GIT_URL
                    ]]
                ])

            }

        }

        stage('Docker Build') {

            steps {

                sh """
                docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .
                """

            }

        }

        stage('Deploy') {

            steps {

                sshagent(credentials: [env.SSH_CREDENTIALS]) {

                    sh """
                    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '

                    cd /home/demo/BINGO

                    git checkout ${GIT_BRANCH}

                    git pull origin ${GIT_BRANCH}

                    docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .

                    kubectl apply -n ${KUBE_NAMESPACE} -f kubernetes/

                    kubectl rollout restart deployment/frontend -n ${KUBE_NAMESPACE}

                    kubectl rollout status deployment/frontend -n ${KUBE_NAMESPACE}

                    kubectl get pods -n ${KUBE_NAMESPACE}

                    '

                    """

                }

            }

        }

    }

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
