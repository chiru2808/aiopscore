#!/bin/bash
set -e

ZONE="us-east1-b"
VM_NAME="aiops-vm"

echo "📧 Updating SMTP Configuration on AIOps VM"
echo "============================================"

# Create a script that will update the docker-compose on the VM
gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command='
  cd /opt/aiops
  
  # Backup existing docker-compose
  sudo cp docker-compose.yml docker-compose.yml.bak
  
  # Check if SMTP vars already exist
  if grep -q "AP_SMTP_HOST" docker-compose.yml; then
    echo "SMTP configuration already exists. Updating..."
    # Remove old SMTP lines
    sudo sed -i "/AP_SMTP_/d" docker-compose.yml
  fi
  
  # Add SMTP configuration to the aiops service environment
  sudo sed -i "/AP_FRONTEND_URL:/a\      AP_SMTP_HOST: smtp.zoho.in\n      AP_SMTP_PORT: 587\n      AP_SMTP_USERNAME: hello@aiops.monster\n      AP_SMTP_PASSWORD: DqrKa4EM8Z4J\n      AP_SMTP_SENDER_EMAIL: hello@aiops.monster" docker-compose.yml
  
  echo "✓ SMTP configuration added"
  
  # Show the updated environment section
  echo ""
  echo "Updated environment variables:"
  grep -A 20 "environment:" docker-compose.yml | head -25
  
  # Restart the application
  echo ""
  echo "Restarting application..."
  sudo docker-compose up -d --force-recreate aiops
  
  echo ""
  echo "✓ SMTP configured and application restarted!"
'

echo ""
echo "============================================"
echo "🎉 SMTP Configuration Complete!"
echo "Email verification is now enabled."
echo "============================================"
