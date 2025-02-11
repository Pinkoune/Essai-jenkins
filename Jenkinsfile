pipeline {
    agent any  // Jenkins peut s'exécuter sur n'importe quel agent

    environment {
        FRONT_IMAGE = "tonDockerHub/front-app"
        BACK_IMAGE = "tonDockerHub/back-app"
        IMAGE_TAG = "latest"
    }

    stages {
        stage('Checkout Code') {
            steps {
                git 'https://github.com/Pinkoune/Essai-jenkins.git'  // Remplace par ton repo Git
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    dir('api') {
                        sh 'npm install'
                    }
                    dir('front') {
                        sh 'npm install'
                    }
                }
            }
        }

        stage('Run Tests') {
            steps {
                script {
                    dir('api') {
                        sh 'npm test'
                    }
                }
            }
        }

        stage('Build Front') {
            steps {
                script {
                    dir('front') {
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker build -t $FRONT_IMAGE:$IMAGE_TAG front/'
                sh 'docker build -t $BACK_IMAGE:$IMAGE_TAG api/'
            }
        }

        stage('Push Docker Images') {
            steps {
                sh 'docker push $FRONT_IMAGE:$IMAGE_TAG'
                sh 'docker push $BACK_IMAGE:$IMAGE_TAG'
            }
        }

        stage('Deploy Containers') {
            steps {
                sh 'docker run -d -p 3000:3000 --name front-app $FRONT_IMAGE:$IMAGE_TAG'
                sh 'docker run -d -p 5000:5000 --name back-app $BACK_IMAGE:$IMAGE_TAG'
            }
        }
    }
}
