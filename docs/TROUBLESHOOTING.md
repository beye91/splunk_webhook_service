# Troubleshooting Guide

## Quick Diagnostics

### Check Service Status

```bash
# View all containers
docker compose ps

# Expected output (all should be running/healthy):
# NAME                      STATUS
# splunk-webhook-db         healthy
# splunk-webhook-config-api healthy
# splunk-webhook-service    running
# splunk-webhook-admin-ui   running
```

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f webhook-service

# Last 100 lines
docker compose logs --tail=100 config-api
```

### Test Endpoints

```bash
# Health checks
curl http://localhost:8000/health  # Config API
curl http://localhost:5001/health  # Webhook Service

# Database connection
docker exec splunk-webhook-db pg_isready -U webhook_user -d webhook_admin
```

## Common Issues

### 1. Cannot Access Admin UI

**Symptoms:**
- Browser shows "connection refused"
- Page doesn't load

**Solutions:**

```bash
# Check if admin-ui container is running
docker compose ps admin-ui

# Check container logs
docker compose logs admin-ui

# Restart the container
docker compose restart admin-ui

# Rebuild if needed
docker compose build --no-cache admin-ui
docker compose up -d admin-ui
```

**Verify port mapping:**
```bash
docker port splunk-webhook-admin-ui
# Should show: 3000/tcp -> 0.0.0.0:3000
```

### 2. Login Fails

**Symptoms:**
- "Invalid credentials" error
- Redirect loop

**Solutions:**

1. **Verify credentials:**
   - Default: admin / Admin123!

2. **Check Config API:**
   ```bash
   docker compose logs config-api | grep -i error
   curl http://localhost:8000/health
   ```

3. **Test login directly:**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin&password=Admin123!"
   ```

4. **Reset password in database:**
   ```bash
   docker exec -it splunk-webhook-db psql -U webhook_user -d webhook_admin

   -- Generate new bcrypt hash (use Python or online tool)
   UPDATE users SET password_hash = '$2b$12$...' WHERE username = 'admin';
   ```

### 3. Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- Services fail to start

**Solutions:**

```bash
# Check database is running and healthy
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Verify database is accepting connections
docker exec splunk-webhook-db pg_isready -U webhook_user -d webhook_admin

# Connect to database manually
docker exec -it splunk-webhook-db psql -U webhook_user -d webhook_admin

# Check DATABASE_URL environment variable
docker compose exec config-api env | grep DATABASE
```

**If database is corrupted:**
```bash
# WARNING: This deletes all data!
docker compose down -v
docker compose up -d
```

### 4. Webhook Returns 400 Error

**Symptoms:**
- "Invalid payload structure" error
- "Missing 'result' key" error

**Solutions:**

1. **Verify payload format:**
   ```json
   {
     "result": {
       "mnemonic": "DUP_SRC_IP",
       "host": "switch-01",
       "vendor": "Cisco",
       "message_text": "Error message..."
     }
   }
   ```

2. **Test with curl:**
   ```bash
   curl -X POST "http://localhost:5001/webhook" \
     -H "Content-Type: application/json" \
     -d '{"result":{"mnemonic":"DUP_SRC_IP","host":"test","vendor":"Cisco","message_text":"test"}}'
   ```

3. **Use echo endpoint for debugging:**
   ```bash
   curl -X POST "http://localhost:5001/webhook/echo" \
     -H "Content-Type: application/json" \
     -d '{"your": "data"}'
   ```

### 5. Mnemonic Not Configured

**Symptoms:**
- Webhook returns `{"response": "mnemonic_not_configured"}`

**Solutions:**

1. **Check alert type exists:**
   - Go to Admin UI > Alert Types
   - Verify the mnemonic is listed and enabled

2. **Create alert type via API:**
   ```bash
   curl -X POST "http://localhost:8000/api/v1/alert-types" \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"mnemonic":"YOUR_MNEMONIC","display_name":"Name","enabled":true}'
   ```

3. **Check database directly:**
   ```bash
   docker exec -it splunk-webhook-db psql -U webhook_user -d webhook_admin
   SELECT mnemonic, enabled FROM alert_types;
   ```

### 6. LLM Not Responding

**Symptoms:**
- Long processing times
- Timeout errors
- Empty LLM response in logs

**Solutions:**

#### For OpenAI:

1. **Verify API key:**
   - Go to Admin UI > LLM Providers
   - Check if provider shows "API Key: Configured"

2. **Test provider:**
   - Click play icon on provider card
   - Check for error messages

3. **Check OpenAI status:**
   - Visit https://status.openai.com/

4. **Verify network access:**
   ```bash
   docker compose exec webhook-service curl -I https://api.openai.com
   ```

#### For Ollama:

1. **Verify Ollama is running:**
   ```bash
   curl http://<ollama-host>:11434/api/tags
   ```

2. **Check model is available:**
   ```bash
   curl http://<ollama-host>:11434/api/tags | jq '.models[].name'
   ```

3. **Test model directly:**
   ```bash
   curl http://<ollama-host>:11434/api/generate \
     -d '{"model":"llama3.1","prompt":"Hello"}'
   ```

### 7. ServiceNow Tickets Not Created

**Symptoms:**
- Webhook completes but no ticket created
- "ticket_created": false in response

**Solutions:**

1. **Check notification channel:**
   - Go to Alert Types > click bell icon
   - Verify ServiceNow channel exists

2. **Test ServiceNow connection:**
   - Go to ServiceNow config
   - Click play icon to test

3. **Check credentials:**
   - Verify username/password are correct
   - Check user has incident creation permissions

4. **Check ServiceNow instance URL:**
   - Should be full URL: `https://dev12345.service-now.com`
   - Not just the instance name

5. **View detailed error:**
   ```bash
   docker compose logs webhook-service | grep -i servicenow
   ```

6. **Test API directly:**
   ```bash
   curl -X POST "https://dev12345.service-now.com/api/now/table/incident" \
     -u "username:password" \
     -H "Content-Type: application/json" \
     -d '{"short_description":"Test ticket"}'
   ```

### 8. Emails Not Sending

**Symptoms:**
- "email_sent": false in response
- No emails received

**Solutions:**

1. **Check notification channel:**
   - Go to Alert Types > click bell icon
   - Verify SMTP channel exists with recipients

2. **Test SMTP connection:**
   - Go to Email/SMTP config
   - Enter test email address
   - Click play icon to test

3. **Verify SMTP settings:**
   - Port 587 with TLS (STARTTLS)
   - Port 465 with SSL
   - Correct username/password

4. **Check SMTP logs:**
   ```bash
   docker compose logs webhook-service | grep -i smtp
   docker compose logs webhook-service | grep -i email
   ```

5. **Test SMTP manually:**
   ```bash
   # Using Python
   python3 -c "
   import smtplib
   server = smtplib.SMTP('smtp.example.com', 587)
   server.starttls()
   server.login('user', 'password')
   server.sendmail('from@example.com', 'to@example.com', 'Test')
   server.quit()
   "
   ```

6. **Check spam folder:**
   - Test emails might be filtered

### 9. Docker Networking Issues

**Symptoms:**
- Services can't communicate
- "Connection refused" between containers

**Solutions:**

```bash
# Verify network exists
docker network ls | grep webhook

# Inspect network
docker network inspect splunk_weberhook_servicenow_webhook-network

# Verify containers are on network
docker inspect splunk-webhook-config-api | grep NetworkMode

# Test inter-container connectivity
docker compose exec config-api ping postgres
docker compose exec config-api curl http://webhook-service:5000/health
```

**If network is broken:**
```bash
docker compose down
docker network prune
docker compose up -d
```

### 10. Container Keeps Restarting

**Symptoms:**
- Container status shows "Restarting"
- Service briefly available then down

**Solutions:**

```bash
# Check container logs for crash reason
docker compose logs --tail=200 <service-name>

# Check for OOM (Out of Memory)
docker stats

# Inspect container exit code
docker inspect splunk-webhook-service | grep -A 5 State

# Common fixes:
# 1. Increase Docker memory limit
# 2. Fix configuration errors
# 3. Check database connectivity
```

## Performance Issues

### Slow Webhook Processing

**Symptoms:**
- Processing time > 30 seconds
- Timeout errors

**Solutions:**

1. **Check LLM response time:**
   - View logs page for llm_response_time_ms
   - Consider using faster model

2. **Optimize Gunicorn workers:**
   ```dockerfile
   # In webhook-service/Dockerfile
   CMD ["gunicorn", "-w", "8", ...]  # Increase workers
   ```

3. **Add database indexes:**
   ```sql
   CREATE INDEX idx_alert_types_mnemonic ON alert_types(mnemonic);
   ```

4. **Monitor resource usage:**
   ```bash
   docker stats
   ```

### Database Slow Queries

```bash
# Connect to database
docker exec -it splunk-webhook-db psql -U webhook_user -d webhook_admin

# Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

## Recovery Procedures

### Reset Admin Password

```bash
# Generate new bcrypt hash
docker compose exec config-api python3 -c "
from passlib.hash import bcrypt
print(bcrypt.hash('NewPassword123!'))
"

# Update in database
docker exec -it splunk-webhook-db psql -U webhook_user -d webhook_admin -c "
UPDATE users SET password_hash = '\$2b\$12\$...' WHERE username = 'admin';
"
```

### Recreate Encryption Key

**WARNING: This invalidates all stored credentials!**

```bash
# Generate new key
openssl rand -base64 32

# Update .env file
ENCRYPTION_KEY=<new-key>

# Restart services
docker compose down
docker compose up -d

# Re-enter all credentials in Admin UI
```

### Full System Reset

```bash
# Stop everything
docker compose down -v

# Remove images
docker rmi $(docker images -q splunk_weberhook_servicenow*)

# Clean Docker system
docker system prune -a

# Rebuild and start
docker compose build --no-cache
docker compose up -d
```

## Getting Help

### Collect Debug Information

```bash
# System info
docker version
docker compose version

# Container status
docker compose ps -a

# All logs
docker compose logs > debug-logs.txt 2>&1

# Environment (redact secrets!)
docker compose config | grep -v PASSWORD | grep -v SECRET | grep -v KEY
```

### Log Locations

- **Webhook Service**: `docker compose logs webhook-service`
- **Config API**: `docker compose logs config-api`
- **Database**: `docker compose logs postgres`
- **Admin UI**: `docker compose logs admin-ui`
