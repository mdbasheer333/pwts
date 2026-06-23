pipeline {
    agent {
        label 'docker-agent1'
    }

    stages {
        stage('Test') {
            agent {
                docker {
                    image 'mcr.microsoft.com/playwright:v1.60.0-noble'
                    args '--ipc=host'
                }
            }
            steps {
                sh 'npm ci'
                sh 'npx playwright test'
            }
        }
    }
}