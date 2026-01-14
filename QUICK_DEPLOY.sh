#!/bin/bash
# Quick deployment script for Splunk webhook service
# Run this on the server: 198.18.134.22

set -e  # Exit on error

echo "=========================================="
echo "Splunk Webhook Service - Quick Deploy"
echo "=========================================="

# Navigate to service directory
cd /opt/webhook_service

echo ""
echo "Step 1: Stopping old container..."
docker stop splunk-webhook 2>/dev/null || echo "No container to stop"
docker rm splunk-webhook 2>/dev/null || echo "No container to remove"

echo ""
echo "Step 2: Building new Docker image..."
docker build -t splunk-webhook:latest .

echo ""
echo "Step 3: Starting new container..."
docker run -d \
  --name splunk-webhook \
  -p 5000:5000 \
  --restart unless-stopped \
  splunk-webhook:latest

echo ""
echo "Step 4: Waiting for container to start..."
sleep 3

echo ""
echo "Step 5: Checking container status..."
docker ps | grep splunk-webhook

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "View logs with:"
echo "  docker logs -f splunk-webhook"
echo ""
echo "Test endpoints:"
echo "  curl http://198.18.134.22:5000/health"
echo "  curl http://198.18.134.22:5000/test"
echo ""
echo "Monitor in real-time:"
echo "  docker logs -f splunk-webhook"
echo ""
