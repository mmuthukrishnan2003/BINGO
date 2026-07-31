pipeline {

    agent any

    parameters {

        choice(
            name: 'BRANCH',
            choices: ['dev','preprod','main'],
            description: 'Git Branch'
        )

        choice(
            name: 'APPLICATION',
            choices: ['frontend','backend','both'],
            description: 'Application'
        )

    }

    environment {

        //==============================
        // Frontend Server
        //==============================

        FRONTEND_SERVER = "172.16.0.111"

        //==============================
        // Backend Server
        //==============================

        BACKEND_SERVER = "172.16.0.112"

        //==============================
        // Jenkins Credential ID
        //==============================

        SSH_CREDENTIALS = "ubuntu-server"

        //==============================
        // Docker Image
        //==============================

        IMAGE_NAME="demo/frontend"

        ENV_NAME=""
    }

    stages {

        //---------------------------------------
        // Environment Selection
        //---------------------------------------

        stage('Set Environment') {

            steps {

                script {

                    if(params.BRANCH=="dev"){
                        env.ENV_NAME="DEV"
                    }

                    else if(params.BRANCH=="preprod"){
                        env.ENV_NAME="PREPROD"
                    }

                    else{
                        env.ENV_NAME="PROD"
                    }

                    echo "Branch : ${params.BRANCH}"
                    echo "Environment : ${env.ENV_NAME}"
                    echo "Application : ${params.APPLICATION}"

                }

            }

        }

        //---------------------------------------
        // Checkout
        //---------------------------------------

        stage('Checkout'){

            steps{

                git branch: params.BRANCH,
                url:'https://gitlab.com/demo/project.git'

            }

        }

        //---------------------------------------
        // Docker Build
        //---------------------------------------

        stage('Docker Build'){

            steps{

                sh """

                docker build \
                -t ${IMAGE_NAME}:${BUILD_NUMBER} .

                """

            }

        }

        //---------------------------------------
        // Deploy Frontend
        //---------------------------------------

        stage('Deploy Frontend'){

            when{

                expression{

                    params.APPLICATION=="frontend" ||
                    params.APPLICATION=="both"

                }

            }

            steps{

                sshagent(credentials:[SSH_CREDENTIALS]){

                    sh """

                    ssh demo@${FRONTEND_SERVER} '

                    kubectl apply -f /home/demo/project/kubernetes/

                    '

                    """

                }

            }

        }

        //---------------------------------------
        // Deploy Backend
        //---------------------------------------

        stage('Deploy Backend'){

            when{

                expression{

                    params.APPLICATION=="backend" ||
                    params.APPLICATION=="both"

                }

            }

            steps{

                sshagent(credentials:[SSH_CREDENTIALS]){

                    sh """

                    ssh demo@${BACKEND_SERVER} '

                    kubectl apply -f /home/demo/project/kubernetes/

                    '

                    """

                }

            }

        }

    }

}
