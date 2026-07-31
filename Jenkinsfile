/******************************************************
 * STAGE 4 : DEPLOY TO SERVER
 ******************************************************/
stage('Deploy') {

    steps {

        // Use SSH credentials stored in Jenkins
        sshagent(credentials: [env.SSH_CREDENTIALS]) {

            sh """

            ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '

            echo "======================================="
            echo "Connected to Server Successfully"
            echo "======================================="

            # Go to the Git project
            cd /home/demo/BINGO

            # Show current working directory
            pwd

            # Display available branches
            git branch -a

            # Checkout selected branch
            git checkout ${params.BRANCH}

            # Pull latest source code
            git pull origin ${params.BRANCH}

            # Build Docker image
            docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} .

            # Verify Docker image
            docker images | grep ${IMAGE_NAME}

            # Deploy Kubernetes manifests
            kubectl apply -n ${env.KUBE_NAMESPACE} -f kubernetes/

            # Restart Kubernetes deployment
            kubectl rollout restart deployment/frontend -n ${env.KUBE_NAMESPACE}

            # Wait until deployment completes
            kubectl rollout status deployment/frontend -n ${env.KUBE_NAMESPACE}

            # Display running pods
            kubectl get pods -n ${env.KUBE_NAMESPACE}

            # Display services
            kubectl get svc -n ${env.KUBE_NAMESPACE}

            echo "======================================="
            echo "Deployment Completed Successfully"
            echo "======================================="

            '

            """

        }

    }

}
