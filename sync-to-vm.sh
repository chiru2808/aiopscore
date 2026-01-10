#!/bin/bash
set -e

ZONE="us-east1-b"
VM_NAME="aiops-vm"

echo "📦 Syncing files to VM..."

# Copy docker-compose and configs
gcloud compute scp docker-compose.yml $VM_NAME:/opt/aiops/ --zone=$ZONE
gcloud compute scp .env.example $VM_NAME:/opt/aiops/.env --zone=$ZONE
gcloud compute scp Dockerfile $VM_NAME:/opt/aiops/ --zone=$ZONE
gcloud compute scp docker-entrypoint.sh $VM_NAME:/opt/aiops/ --zone=$ZONE
gcloud compute scp nginx.react.conf $VM_NAME:/opt/aiops/ --zone=$ZONE

# Copy entire project for building
echo "📦 Syncing project files (this may take a moment)..."
gcloud compute scp --recurse dist $VM_NAME:/opt/aiops/ --zone=$ZONE
gcloud compute scp --recurse packages $VM_NAME:/opt/aiops/ --zone=$ZONE

echo "✓ Files synced successfully!"
echo "📋 Next step: SSH to VM and start the application"
echo "   gcloud compute ssh $VM_NAME --zone=$ZONE"
