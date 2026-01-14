# Deployment Guide - Enhanced Splunk Webhook Service

## Changes Summary

### What Was Fixed

1. **Request Logging Middleware** - Now logs EVERY incoming request before processing
   - Method, path, headers, source IP
   - Full request body for POST requests
   - Helps identify if requests are arriving at all

2. **Async Compatibility Fixed** - Converted all async routes to synchronous
   - Changed `AsyncOpenAI` → `OpenAI`
   - Changed `AsyncClient` → `Client`
   - Removed all `await` keywords
   - Now compatible with standard Gunicorn workers

3. **Enhanced Error Logging** - Added detailed logging throughout
   - Every processing step is logged
   - Stack traces with `exc_info=True`
   - Validates payload structure and logs missing fields
   - Logs API responses from ServiceNow and OpenAI

4. **New Debug Endpoints**
   - `GET /health` - Service status and uptime info
   - `POST /webhook/echo` - Echo endpoint to test POST requests
   - Enhanced `GET /test` - Test ServiceNow ticket creation

5. **Startup Banner** - Logs configuration on service start
   - Shows all available endpoints
   - Displays ServiceNow instance details
   - Confirms listening address

6. **Optimized Dockerfile**
   - Reduced workers from 10 to 4 (better for I/O bound tasks)
   - Added debug logging: `--log-level debug`
   - Access logs to stdout: `--access-logfile -`
   - Capture Flask output: `--capture-output`
   - 120 second timeout for LLM API calls

---

## Deployment Instructions

### Step 1: Copy Files to Server

```bash
# On your local machine
scp llmwebhook.py root@198.18.134.22:/opt/webhook_service/
scp Dockerfile root@198.18.134.22:/opt/webhook_service/
```

### Step 2: SSH to Server

```bash
ssh root@198.18.134.22
cd /opt/webhook_service
```

### Step 3: Stop Old Container (if running)

```bash
# Find the container
docker ps | grep webhook

# Stop it (replace <container-id> with actual ID)
docker stop <container-id>
docker rm <container-id>
```

### Step 4: Rebuild Docker Image

```bash
docker build -t splunk-webhook:latest .
```

### Step 5: Start New Container

```bash
docker run -d \
  --name splunk-webhook \
  -p 5000:5000 \
  --restart unless-stopped \
  splunk-webhook:latest
```

### Step 6: Monitor Logs in Real-Time

```bash
docker logs -f splunk-webhook
```

You should see the startup banner:
```
================================================================================
STARTING SPLUNK WEBHOOK TO SERVICENOW SERVICE
================================================================================
Service Start Time: 2025-11-09 22:xx:xx
ServiceNow Instance: ven03091.service-now.com
ServiceNow Username: jorschultz
OpenAI Model: gpt-4o-mini-2024-07-18
Listening on: 0.0.0.0:5000
Available Endpoints:
  POST /webhook - Main webhook handler for Splunk alerts
  POST /webhook/echo - Debug echo endpoint
  GET  /webhook - Info page
  GET  /health - Health check with service info
  GET  /test - Test ServiceNow ticket creation
================================================================================
```

---

## Testing the Service

### Test 1: Health Check

```bash
curl http://198.18.134.22:5000/health
```

Expected: JSON with service status and uptime

### Test 2: Echo Endpoint (Debug)

```bash
curl -X POST http://198.18.134.22:5000/webhook/echo \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Expected: Echo back your data + metadata

### Test 3: ServiceNow Ticket Creation

```bash
curl http://198.18.134.22:5000/test
```

Expected: Creates a test ticket in ServiceNow

### Test 4: Simulate Splunk Webhook

```bash
curl -X POST http://198.18.134.22:5000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "result": {
      "host": "test-router",
      "vendor": "Cisco",
      "mnemonic": "DUP_SRC_IP",
      "message_text": "Duplicate source IP address detected"
    }
  }'
```

Expected:
- Creates ServiceNow ticket
- Calls OpenAI for solution
- Returns success response

---

## Troubleshooting

### Check if container is running

```bash
docker ps | grep splunk-webhook
```

### View all logs

```bash
docker logs splunk-webhook
```

### View recent logs

```bash
docker logs --tail 100 splunk-webhook
```

### Follow logs in real-time

```bash
docker logs -f splunk-webhook
```

### Check container resource usage

```bash
docker stats splunk-webhook
```

### Access container shell

```bash
docker exec -it splunk-webhook /bin/bash
```

---

## What You'll See in Logs

### When Splunk sends a webhook:

```
================================================================================
INCOMING REQUEST: POST /webhook
Remote Address: <splunk-server-ip>
Headers: {'Host': '198.18.134.22:5000', 'Content-Type': 'application/json', ...}
Content-Type: application/json
JSON Body: {full webhook payload}
================================================================================
WEBHOOK POST ENDPOINT CALLED
Webhook received data structure: {formatted JSON}
Processing alert for host: router-01
Mnemonic: DUP_SRC_IP
Message: Duplicate source IP address detected
DUP_SRC_IP detected - processing with LLM
Getting a solution from OpenAI
OpenAI response received successfully
Retrieved sys_id: abc123...
Creating ServiceNow ticket with payload: {...}
Incident created successfully! Ticket: INC0012345
RESPONSE: 200 for POST /webhook
```

### If NO webhook arrives:

- You'll see NO log entries when Splunk fires the alert
- This indicates a connectivity/configuration issue
- Check Splunk webhook URL configuration
- Verify firewall rules allow Splunk → Server:5000

---

## Next Steps

1. **Deploy to server** using instructions above
2. **Monitor logs** while triggering a Splunk alert
3. **If you see the request arrive**: Great! The logging will show exactly what's happening
4. **If NO request arrives**: Issue is with Splunk webhook configuration or network connectivity

---

## Splunk Webhook Configuration

Ensure Splunk webhook is configured with:

- **URL**: `http://198.18.134.22:5000/webhook`
- **Method**: POST
- **Content-Type**: application/json
- **Payload should include**:
  ```json
  {
    "result": {
      "host": "device-hostname",
      "vendor": "device-vendor",
      "mnemonic": "error-code",
      "message_text": "error message"
    }
  }
  ```

---

## Security Note

**IMPORTANT**: The code currently has hardcoded credentials. For production:

1. Move credentials to environment variables
2. Use Docker secrets or Kubernetes secrets
3. Never commit credentials to git
4. Consider using a secrets management service

Example with environment variables:
```bash
docker run -d \
  --name splunk-webhook \
  -p 5000:5000 \
  -e SNOW_USERNAME="jorschultz" \
  -e SNOW_PASSWORD="Cisco123!" \
  -e OPENAI_API_KEY="sk-proj-..." \
  splunk-webhook:latest
```
