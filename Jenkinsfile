pipeline {

    /*********************************************************
     * AGENT
     * -------------------------------------------------------
     * Specifies where this pipeline will run.
     * "any" means Jenkins can execute on any available agent.
     *********************************************************/
    agent any

    /*********************************************************
     * PARAMETERS
     * -------------------------------------------------------
     * These options appear when clicking
     * "Build with Parameters" in Jenkins.
     *
     * BRANCH:
     *   Select which Git branch to deploy.
     *
     * ENVIRONMENT:
     *   Select which Kubernetes namespace to deploy.
     *********************************************************/
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

    /*********************************************************
     * ENVIRONMENT VARIABLES
     * -------------------------------------------------------
     * These variables are available throughout the pipeline.
     *********************************************************/
    environment {

        // GitHub Repository
        GIT_URL = 'https://github.com/mmuthukrishnan2003/BINGO.git'

        // Deployment Server IP
        SERVER_IP = '172.16.0.111'

        // SSH Login User
        SERVER_USER = 'demo'

        // Jenkins Credentials ID
        // Manage Jenkins -> Credentials
        SSH_CREDENTIALS = 'ubuntu-server'

        // Docker Image Name
        IMAGE_NAME = 'demo/frontend'

        // Kubernetes Namespace
        // This value is assigned later.
        KUBE_NAMESPACE = ''

    }

    /*********************************************************
     * STAGES
     *********************************************************/
    stages {

        /******************************************************
         * STAGE 1
         * SELECT ENVIRONMENT
         ******************************************************/
        stage('Select Environment') {

            steps {

                script {

                    // If user selects IND
                    // Namespace = india

                    if (params.ENVIRONMENT == 'IND') {

                        env.KUBE_NAMESPACE = 'india'

                    }

                    // If user selects US
                    // Namespace = us

                    else {

                        env.KUBE_NAMESPACE = 'us'

                    }

                    echo "================================"
                    echo "Selected Branch      : ${params.BRANCH}"
                    echo "Selected Environment : ${params.ENVIRONMENT}"
                    echo "Namespace            : ${env.KUBE_NAMESPACE}"
                    echo "================================"

                }

            }

        }

        /******************************************************
         * STAGE 2
         * DOWNLOAD SOURCE CODE
         ******************************************************/
        stage('Checkout Source') {

            steps {

                /*
                 * Download the selected Git branch
                 * Example:
                 *
                 * main
                 * dev
                 * preprod
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
         * STAGE 3
         * BUILD DOCKER IMAGE
         ******************************************************/
        stage('Docker Build') {

            steps {

                /*
                 * Build Docker Image
                 *
                 * Example:
                 *
                 * demo/frontend:15
                 */

                sh """

                docker build \
                -t ${IMAGE_NAME}:${BUILD_NUMBER} .

                """

            }

        }

        /******************************************************
         * STAGE 4
         * DEPLOY APPLICATION
         ******************************************************/
        stage('Deploy') {

            steps {

                /*
                 * Login to Deployment Server
                 * using Jenkins SSH Credentials
                 */

                sshagent(credentials: [env.SSH_CREDENTIALS]) {

                    sh """

                    ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '

                    #################################################
                    # Go to Project Directory
                    #################################################

                    cd /home/demo/BINGO

                    #################################################
                    # Change Git Branch
                    #################################################

                    git checkout ${params.BRANCH}

                    #################################################
                    # Download Latest Code
                    #################################################

                    git pull origin ${params.BRANCH}

                    #################################################
                    # Build Docker Image
                    #################################################

                    docker build \
                    -t ${IMAGE_NAME}:${BUILD_NUMBER} .

                    #################################################
                    # Deploy Kubernetes YAML Files
                    #################################################

                    kubectl apply \
                    -n ${KUBE_NAMESPACE} \
                    -f kubernetes/

                    #################################################
                    # Restart Deployment
                    #################################################

                    kubectl rollout restart \
                    deployment/frontend \
                    -n ${KUBE_NAMESPACE}

                    #################################################
                    # Wait Until Deployment Completes
                    #################################################

                    kubectl rollout status \
                    deployment/frontend \
                    -n ${KUBE_NAMESPACE}

                    #################################################
                    # Show Running Pods
                    #################################################

                    kubectl get pods \
                    -n ${KUBE_NAMESPACE}

                    #################################################
                    # Show Running Services
                    #################################################

                    kubectl get svc \
                    -n ${KUBE_NAMESPACE}

                    '

                    """

                }

            }

        }

    }

    /*********************************************************
     * POST SECTION
     * -------------------------------------------------------
     * Executes after all stages finish.
     *********************************************************/
    post {

        success {

            // Runs only if pipeline succeeds
            echo "Deployment Successful"

        }

        failure {

            // Runs only if pipeline fails
            echo "Deployment Failed"

        }

        always {

            // Runs every time
            echo "Pipeline Completed"

        }

    }

}
