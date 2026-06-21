pipeline {
    agent any

    environment {
        SONAR_PROJECT_KEY = 'mspr-backend-main'
        IMAGE_NAME        = 'mspr/backend-main'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Audit sécurité') {
            steps {
                sh 'npm audit --audit-level=critical || true'
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    script {
                        def scannerHome = tool 'SonarQube Scanner'
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=. \
                                -Dsonar.inclusions="**/*.js,**/*.mjs" \
                                -Dsonar.exclusions="**/node_modules/**,**/swagger-output.json"
                        """
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
            }
        }
    }

    post {
        success {
            echo "Pipeline backend-main : SUCCESS (build #${BUILD_NUMBER})"
        }
        failure {
            echo "Pipeline backend-main : FAILURE (build #${BUILD_NUMBER})"
        }
        always {
            deleteDir()
        }
    }
}
