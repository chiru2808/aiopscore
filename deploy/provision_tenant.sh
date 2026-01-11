#!/bin/bash

# Tenant Provisioning Script
# Usage: ./provision_tenant.sh <email> <password> <org_name>

EMAIL=$1
PASSWORD=$2
ORG_NAME=$3
API_URL="${API_URL:-http://localhost:3000}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ] || [ -z "$ORG_NAME" ]; then
    echo "Usage: ./provision_tenant.sh <email> <password> <org_name>"
    exit 1
fi

echo "Provisioning Tenant for Organization: $ORG_NAME"
echo "Admin Email: $EMAIL"

# 1. Sign Up / Create Initial User
RESPONSE=$(curl -s -X POST "$API_URL/v1/authentication/sign-up" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"firstName\": \"Admin\",
    \"lastName\": \"User\",
    \"companyName\": \"$ORG_NAME\",
    \"trackEvents\": false,
    \"newsLetter\": false,
    \"provider\": \"EMAIL\"
}")

TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Error: Failed to create user/tenant."
    echo "Response: $RESPONSE"
    exit 1
fi

echo "Success! Tenant Provisioned."
echo "Admin Token: $TOKEN"
echo "You can now log in at the frontend."
