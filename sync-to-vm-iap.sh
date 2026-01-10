#!/bin/bash
set -e

ZONE="us-east1-b"
VM_NAME="aiops-vm"

echo "📦 Syncing files to VM using IAP tunnel..."

# Create remote directory
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command="sudo mkdir -p /opt/aiops && sudo chown -R \$USER:\$USER /opt/aiops"

# Copy docker-compose and configs
echo "Copying configuration files..."
gcloud compute scp --tunnel-through-iap --zone=$ZONE \
  docker-compose.yml \
  .env \
  Dockerfile \
  docker-entrypoint.sh \
  nginx.react.conf \
  $VM_NAME:/opt/aiops/

# Copy dist directory
echo "Copying dist directory (this may take a few minutes)..."
gcloud compute scp --tunnel-through-iap --zone=$ZONE --recurse \
  dist \
  $VM_NAME:/opt/aiops/

# Copy packages directory  
echo "Copying packages directory..."
gcloud compute scp --tunnel-through-iap --zone=$ZONE --recurse \
  packages \
  $VM_NAME:/opt/aiops/

echo "✓ Files synced successfully!"
echo "📋 Next step: Start the application"
echo "   gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap"
echo "   cd /opt/aiops && docker-compose up -d"
