#!/bin/bash

# AIOps Production Setup Script
# Usage: ./setup.sh

set -e

echo "🚀 Starting AIOps Production Setup..."

# 1. Update System
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Dependencies
echo "🛠️ Installing dependencies..."
sudo apt-get install -y curl git nginx certbot python3-certbot-nginx

# 3. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    echo "✅ Docker installed."
else
    echo "✅ Docker already installed."
fi

# 4. Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin

# 5. Setup Directory
APP_DIR="/opt/aiops"
echo "wm Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# 6. Generate Configuration
echo "📝 Generating configuration..."
cd $APP_DIR

# Create .env if not exists
if [ ! -f .env ]; then
    echo "🔑 Generating secure .env file..."
    
    # Generate random secrets
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -hex 32)
     PostgresPassword=$(openssl rand -hex 16)
    
    cat > .env << EOF
AP_ENVIRONMENT=production
AP_FRONTEND_URL=https://app.aiops.com
AP_WEBHOOK_URL=https://app.aiops.com

# Branding
AP_PLATFORM_NAME=AIOps

# Security (Auto-Generated)
AP_ENCRYPTION_KEY=$ENCRYPTION_KEY
AP_JWT_SECRET=$JWT_SECRET

# Database
AP_POSTGRES_DATABASE=aiops_prod
AP_POSTGRES_USERNAME=aiops_user
AP_POSTGRES_PASSWORD=$PostgresPassword
AP_POSTGRES_HOST=postgres
AP_POSTGRES_PORT=5432

# Redis
AP_REDIS_HOST=redis
AP_REDIS_PORT=6379

# Execution
AP_EXECUTION_MODE=UNSANDBOXED
EOF
    echo "✅ .env created with secure secrets."
else
    echo "⚠️ .env already exists, skipping generation."
fi

echo "🎉 Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Copy your docker-compose.production.yml to $APP_DIR"
echo "2. Run 'docker compose up -d'"
echo "3. Configure Nginx (see documentation)"
