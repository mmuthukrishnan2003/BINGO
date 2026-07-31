pipeline {

    agent any

    environment {

        // ==========================
        // Server Details
        // ==========================

        SERVER_IP = "172.16.0.111"      // <-- Your server IP

        SERVER_USER = "demo"            // <-- Your username

        // PASSWORD IS NOT WRITTEN HERE.
        // Jenkins Credentials should store it securely.
        SSH_CREDENTIALS = "ubuntu-server"
    }

    stages {

        stage('Checkout') {

            steps {

                git branch: "dev",
                url: "https://gitlab.com/demo/project.git"

            }

        }

        stage('Docker Build') {

            steps {

                sh 'docker build -t demo/frontend:latest ./frontend'

            }

        }

        stage('Deploy Kubernetes') {

            steps {

                sshagent(credentials: ['ubuntu-server']) {

                    sh """
                    ssh ${SERVER_USER}@${SERVER_IP} '

                        kubectl apply -f /home/demo/project/kubernetes/

                    '
                    """
                }

            }

        }

    }

}
