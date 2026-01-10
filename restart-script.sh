#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-east1-b"
VM_NAME="aiops-vm"

echo "🔄 Quick Fix: Restarting AIOps & Resetting Data..."
echo "=========================================================="

# Execute fix on VM
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command='
  cd /opt/aiops
  
  echo "🛑 Stopping containers..."
  sudo docker stop aiops-aiops-1 2>/dev/null || true
  sudo docker rm aiops-aiops-1 2>/dev/null || true
  sudo docker-compose down

  echo "🧹 Removing Redis & Postgres volumes..."
  # Fixes RDB version mismatch
  sudo docker volume rm aiops_redis_data 2>/dev/null || true
  # Fixes Postgres password mismatch (forces re-init with new password)
  sudo docker volume rm aiops_postgres_data 2>/dev/null || true

  echo "📝 Regenerating clean .env file..."
  cat <<EOF | sudo tee .env > /dev/null
# Database Settings
AP_POSTGRES_DATABASE=activepieces
AP_POSTGRES_USERNAME=postgres
AP_POSTGRES_PASSWORD=changeme
AP_POSTGRES_HOST=postgres
AP_POSTGRES_PORT=5432
AP_DB_TYPE=POSTGRES

# Redis Settings
AP_REDIS_HOST=redis
AP_REDIS_PORT=6379

# SMTP Settings
AP_SMTP_HOST=smtp.zoho.in
AP_SMTP_PORT=587
AP_SMTP_USERNAME=hello@aiops.monster
AP_SMTP_PASSWORD=DqrKa4EM8Z4J
AP_SMTP_SENDER_EMAIL=hello@aiops.monster
AP_SMTP_USE_SSL=false

# Security
AP_ENCRYPTION_KEY=93c6a86df85625ef485f450607199a65
AP_JWT_SECRET=72c4cde9e67b37a1255be13ddca42cd8d3fa69b36552eece4abca0120c03e8cb
AP_FRONTEND_URL=http://35.185.3.141

# System
AP_NODE_EXECUTABLE_PATH=/usr/local/bin/node
AP_EXECUTION_MODE=UNSANDBOXED
EOF

  echo "🟢 Starting containers..."
  sudo docker-compose up -d --force-recreate --remove-orphans
  
  echo ""
  echo "✅ Application restarted with fresh volumes!"
  sudo docker-compose ps
'
