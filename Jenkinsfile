pipeline {
    agent any

    parameters {

        choice(
            name: 'BRANCH',
            choices: ['dev', 'preprod', 'main'],
            description: 'Select Git Branch'
        )

        choice(
            name: 'APPLICATION',
            choices: ['frontend', 'backend', 'both'],
            description: 'Select Application'
        )
    }

    environment {
        FRONTEND_SERVER = "172.16.0.111"
        BACKEND_SERVER  = "172.16.0.112"
        ENV_NAME = ""
    }

    stages {

        stage('Set Environment') {
            steps {
                script {

                    if (params.BRANCH == "dev") {
                        env.ENV_NAME = "DEV"
                    } else if (params.BRANCH == "preprod") {
                        env.ENV_NAME = "PREPROD"
                    } else if (params.BRANCH == "main") {
                        env.ENV_NAME = "PROD"
                    }

                    echo "Branch      : ${params.BRANCH}"
                    echo "Environment : ${env.ENV_NAME}"
                    echo "Application : ${params.APPLICATION}"
                }
            }
        }

        stage('Checkout') {
            steps {
                git branch: params.BRANCH,
                    url: 'https://gitlab.com/your-project.git'
            }
        }

        stage('Deploy Frontend') {
            when {
                expression {
                    params.APPLICATION == "frontend" ||
                    params.APPLICATION == "both"
                }
            }

            steps {
                sh """
                ssh user@${FRONTEND_SERVER} "
                    cd /var/www/frontend &&
                    git checkout ${params.BRANCH} &&
                    git pull origin ${params.BRANCH}
                "
                """
            }
        }

        stage('Deploy Backend') {
            when {
                expression {
                    params.APPLICATION == "backend" ||
                    params.APPLICATION == "both"
                }
            }

            steps {
                sh """
                ssh user@${BACKEND_SERVER} "
                    cd /var/www/backend &&
                    git checkout ${params.BRANCH} &&
                    git pull origin ${params.BRANCH}
                "
                """
            }
        }
    }
}
