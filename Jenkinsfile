pipeline {
    agent any  // Jenkins peut s'exécuter sur n'importe quel agent

    environment {
        NODEJS_HOME = tool 'NodeJS'
    }

    stages {
        stage('Checkout') {
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

        stage('Start Applications') {
            steps {
                parallel (
                    "Frontend": {
                        dir('front') {
                            sh 'npm start &'
                        }
                    },
                    "Backend": {
                        dir('api') {
                            sh 'npm start &'
                        }
                    }
                )
            }
        }
    }

    post {
        always {
            echo 'Pipeline terminé.'
        }
    }
}
