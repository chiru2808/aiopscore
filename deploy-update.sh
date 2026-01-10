#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-east1-b"
VM_NAME="aiops-vm"
BUCKET_NAME="${PROJECT_ID}-aiops-deploy"

echo "🚀 Updating AIOps Deployment (Code Only)"
echo "============================================"

# Step 0: Optimize VM (Swap)
echo "🔧 Step 0/6: Optimizing VM..."
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command='
  # Add 4GB Swap (Reduced from 8GB to save disk)
  # Remove execution if exists to ensure upgrade
  sudo swapoff /swapfile 2>/dev/null || true
  sudo rm -f /swapfile 2>/dev/null || true

  # Prune Docker to free up substantial space before creating files
  echo "Pruning Docker system to free space..."
  sudo docker system prune -af --volumes || true
  
  echo "Creating 4GB swapfile..."
  # Use fallocate which is faster, fallback to dd if needed? No, fallocate is fine.
  if sudo fallocate -l 4G /swapfile; then
      sudo chmod 600 /swapfile
      sudo mkswap /swapfile
      sudo swapon /swapfile
      
      # Add to fstab if not present
      if ! grep -q "/swapfile swap swap" /etc/fstab; then
        echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab
      fi
      echo "Swap created (4GB)."
  else
      echo "Failed to create 4GB swap (Disk full?). Skipping swap creation."
  fi
'

# Cleanup local to prevent build issues
echo "🧹 Step 1/6: Cleaning local Docker builder..."
docker builder prune -af > /dev/null 2>&1 || true

# Step 1: Build & Save Docker image
echo "📦 Step 1/5: Building & Save Docker image (amd64)..."
# Build for x86_64 (VM architecture)
docker build --platform linux/amd64 -t gcr.io/$PROJECT_ID/aiops-platform:latest .
# Save to tar
docker save gcr.io/$PROJECT_ID/aiops-platform:latest | gzip > /tmp/aiops-image.tar.gz
echo "✓ Image built & saved ($(du -h /tmp/aiops-image.tar.gz | cut -f1))"

# Step 2: Upload image to bucket
echo "📤 Step 2/5: Uploading image to Cloud Storage..."
# Clear tracking files to prevent "ResumableUploadAbortException"
rm -rf ~/.gsutil/tracker-files
# Ensure bucket exists (idempotent)
gsutil mb -p $PROJECT_ID -l us-east1 gs://$BUCKET_NAME 2>/dev/null || true
gsutil -m cp /tmp/aiops-image.tar.gz gs://$BUCKET_NAME/
gsutil cp docker-compose.yml gs://$BUCKET_NAME/

echo "  -> 3. Streaming & Loading Docker image (Parallel)..."
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --ssh-flag="-o ServerAliveInterval=60" --ssh-flag="-o ServerAliveCountMax=10" --command="
  set -e
  echo 'Updating configuration...'
  gsutil cp gs://$BUCKET_NAME/docker-compose.yml /tmp/docker-compose.yml
  sudo mv /tmp/docker-compose.yml /opt/aiops/docker-compose.yml

  echo 'Streaming Docker image (Download + Load)...'
  # Stream download directly to docker load (Parallelizes Network & CPU, saves Disk)
  gsutil cp gs://$BUCKET_NAME/aiops-image.tar.gz - | gunzip -c | sudo docker load
  
  echo '✓ Image loaded successfully'
"

# Step 4: Configure SMTP and Restart
echo "📧 Step 4/5: Configuring SMTP & Restarting..."
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --ssh-flag="-o ServerAliveInterval=60" --ssh-flag="-o ServerAliveCountMax=10" --command='
  cd /opt/aiops
  
  # Create/Update .env file with SMTP settings
  
  echo "Updating .env file..."
  
  # Append or create .env
  # Overwrite .env file to prevent duplicates
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

  # Stop and remove ALL containers to ensure volumes can be deleted
  echo "Stopping all containers..."
  sudo docker-compose down || true
  # Force remove just in case `down` missed something or names mismatch
  sudo docker rm -f activepieces postgres redis aiops-aiops-1 2>/dev/null || true

  # Remove Redis volume to fix RDB version mismatch (v12 vs v11)
  # Remove Postgres volume to enforce password update (changeme)
  echo "Cleaning up volumes..."
  sudo docker volume rm aiops_redis_data aiops_postgres_data 2>/dev/null || true

  # Recreate containers to pick up new .env values and remove orphans
  sudo docker-compose up -d --force-recreate --remove-orphans
  
  echo ""
  echo "✓ Application updated, SMTP configured, and restarted!"
  sudo docker-compose ps
'

# Cleanup local
rm /tmp/aiops-image.tar.gz 2>/dev/null || true

echo ""
echo "============================================"
echo "🎉 Deployment Sync Complete!"
echo "Verify at: http://35.185.3.141"
echo "============================================"
