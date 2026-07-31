pipeline {

    agent any

    environment {

        APP_NAME = "bingo"

        IMAGE_NAME = "bingo-backend"

        CONTAINER_NAME = "bingo"

        PORT = "3001"

    }

    stages {

        stage('Checkout') {

            steps {

                checkout scm

            }

        }

        stage('Build Docker Image') {

            steps {

                sh """
                docker build -t ${IMAGE_NAME}:latest .
                """
            }

        }

        stage('Stop Old Container') {

            steps {

                sh """
                docker stop ${CONTAINER_NAME} || true
                docker rm ${CONTAINER_NAME} || true
                """
            }

        }

        stage('Run Container') {

            steps {

                sh """
                docker run -d \
                --name ${CONTAINER_NAME} \
                -p ${PORT}:3000 \
                ${IMAGE_NAME}:latest
                """
            }

        }

        stage('Verify Deployment') {

            steps {

                sh """
                docker ps
                docker logs ${CONTAINER_NAME} --tail 20
                """
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

    }

}
