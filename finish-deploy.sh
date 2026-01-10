#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-east1-b"
VM_NAME="aiops-vm"
BUCKET_NAME="${PROJECT_ID}-aiops-deploy"

echo "🚀 Resuming Deployment (Skipping Build/Upload)..."
echo "============================================"

# Step 3: Download and load on VM
echo "🚀 Step 3/5: Loading new image on VM..."
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command="
  set -e
  echo 'Downloading image & config...'
  gsutil cp gs://$BUCKET_NAME/aiops-image.tar.gz /tmp/
  gsutil cp gs://$BUCKET_NAME/docker-compose.yml /tmp/
  
  echo 'Updating configuration...'
  sudo mv /tmp/docker-compose.yml /opt/aiops/docker-compose.yml

  echo 'Loading Docker image...'
  gunzip -c /tmp/aiops-image.tar.gz | sudo docker load
  
  echo 'Cleaning up...'
  rm /tmp/aiops-image.tar.gz
  
  echo '✓ Image loaded successfully'
"

# Step 4: Configure SMTP and Restart
echo "📧 Step 4/5: Configuring SMTP & Restarting..."
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command='
  cd /opt/aiops
  
  # Create/Update .env file with SMTP settings
  echo "Updating .env file..."
  
  cat <<EOF | sudo tee -a .env > /dev/null

# SMTP Settings added by deploy script
AP_SMTP_HOST=smtp.zoho.in
AP_SMTP_PORT=587
AP_SMTP_USERNAME=hello@aiops.monster
AP_SMTP_PASSWORD=DqrKa4EM8Z4J
AP_SMTP_SENDER_EMAIL=hello@aiops.monster
AP_SMTP_USE_SSL=false
EOF
  
  # Recreate containers
  sudo docker-compose up -d --force-recreate
  
  echo ""
  echo "✓ Application updated, SMTP configured, and restarted!"
  sudo docker-compose ps
'

echo ""
echo "============================================"
echo "🎉 Deployment Sync Complete (Resumed)!"
echo "Verify at: http://35.185.3.141"
echo "============================================"
