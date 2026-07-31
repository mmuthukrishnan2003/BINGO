pipeline {

    agent any

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

    environment {

        // ============================
        // Git Repository
        // ============================
        GIT_URL = "https://gitlab.com/your-project.git"

        // ============================
        // Deployment Server
        // ============================
        SERVER_IP = "172.16.0.111"
        SERVER_USER = "demo"

        // ============================
        // Jenkins Credential ID
        // Manage Jenkins -> Credentials
        // Username : demo
        // Password : ****
        // ID : ubuntu-server
        // ============================
        SSH_CREDENTIALS = "ubuntu-server"

        // ============================
        // Docker Image
        // ============================
        IMAGE_NAME = "demo/frontend"

        // ============================
        // Kubernetes Namespace
        // ============================
        KUBE_NAMESPACE = ""
    }

    stages {

        stage('Select Environment') {

            steps {

                script {

                    if (params.ENVIRONMENT == "IND") {

                        env.KUBE_NAMESPACE = "india"

                    } else {

                        env.KUBE_NAMESPACE = "us"

                    }

                    echo "==============================="
                    echo "Branch      : ${params.BRANCH}"
                    echo "Environment : ${params.ENVIRONMENT}"
                    echo "Namespace   : ${env.KUBE_NAMESPACE}"
                    echo "==============================="

                }

            }

        }

        stage('Checkout Source') {

            steps {

                git(
                    branch: params.BRANCH,
                    url: env.GIT_URL
                )

            }

        }

        stage('Build Docker Image') {

            steps {

                sh """

                docker build \
                -t ${IMAGE_NAME}:${BUILD_NUMBER} .

                """

            }

        }

        stage('Deploy To Kubernetes') {

            steps {

                sshagent(credentials: [SSH_CREDENTIALS]) {

                    sh """

                    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '

                    cd /home/demo/project

                    docker load < frontend.tar || true

                    kubectl apply -n ${KUBE_NAMESPACE} -f kubernetes/

                    kubectl rollout restart deployment/frontend -n ${KUBE_NAMESPACE}

                    kubectl get pods -n ${KUBE_NAMESPACE}

                    '

                    """

                }

            }

        }

    }

    post {

        success {

            echo "Deployment Completed Successfully"

        }

        failure {

            echo "Deployment Failed"

        }

        always {

            echo "Pipeline Finished"

        }

    }

}
