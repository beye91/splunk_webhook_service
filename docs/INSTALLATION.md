# Installation Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- 4GB RAM minimum
- 10GB disk space

## Quick Start (Local Deployment)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd splunk_weberhook_serviceNow
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Database
POSTGRES_DB=webhook_admin
POSTGRES_USER=webhook_user
POSTGRES_PASSWORD=WebhookAdmin2024!
POSTGRES_PORT=5433

# Security (REQUIRED - generate new values!)
ENCRYPTION_KEY=your-32-byte-base64-key
JWT_SECRET=your-jwt-secret-key

# Service Ports
CONFIG_API_PORT=8000
WEBHOOK_PORT=5001
ADMIN_UI_PORT=3000

# CORS (add your domains)
CORS_ORIGINS=http://localhost:3000

# Admin UI API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Generate Encryption Key

```bash
# Generate a secure encryption key
openssl rand -base64 32
```

Copy the output to `ENCRYPTION_KEY` in your `.env` file.

### 4. Build and Start Services

```bash
# Build all containers (use --no-cache for clean builds)
docker compose build --no-cache

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### 5. Verify Deployment

```bash
# Check service health
docker compose ps

# Expected output:
# NAME                      STATUS
# splunk-webhook-db         healthy
# splunk-webhook-config-api healthy
# splunk-webhook-service    running
# splunk-webhook-admin-ui   running
```

### 6. Access the Application

- **Admin UI**: http://localhost:3000
- **Config API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Webhook Endpoint**: http://localhost:5001/webhook

### 7. Initial Login

- **Username**: admin
- **Password**: Admin123!

## Remote Server Deployment

### Deployment to 192.168.1.213

```bash
# SSH to the server
ssh cbeye@192.168.1.213

# Clone or pull latest code
cd /opt/splunk-webhook
git pull origin main

# Update environment file
nano .env

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Check status
docker compose ps
```

### Environment Configuration for Remote

```bash
# .env for remote deployment
POSTGRES_DB=webhook_admin
POSTGRES_USER=webhook_user
POSTGRES_PASSWORD=SecurePassword!

ENCRYPTION_KEY=<generate-new-key>
JWT_SECRET=<generate-new-secret>

# Use server IP for CORS
CORS_ORIGINS=http://192.168.1.213:3000

# API URL for Admin UI
NEXT_PUBLIC_API_URL=http://192.168.1.213:8000
```

## Port Mappings

| Service | Internal Port | External Port | Description |
|---------|--------------|---------------|-------------|
| PostgreSQL | 5432 | 5433 | Database |
| Config API | 8000 | 8000 | REST API |
| Webhook Service | 5000 | 5001 | Webhook processor |
| Admin UI | 3000 | 3000 | Web interface |

## Service Dependencies

```
┌─────────────┐
│ PostgreSQL  │ (starts first)
└──────┬──────┘
       │ healthy
       ▼
┌─────────────┐
│ Config API  │ (waits for healthy DB)
└──────┬──────┘
       │ started
       ▼
┌─────────────┐    ┌─────────────┐
│  Webhook    │    │  Admin UI   │ (both wait for config-api)
│  Service    │    │             │
└─────────────┘    └─────────────┘
```

## Health Checks

### PostgreSQL
```bash
# Check database is accepting connections
docker exec splunk-webhook-db pg_isready -U webhook_user -d webhook_admin
```

### Config API
```bash
# Health endpoint
curl http://localhost:8000/health
```

### Webhook Service
```bash
# Health endpoint
curl http://localhost:5001/health

# Expected response:
{
  "status": "healthy",
  "uptime_seconds": 12345
}
```

## Container Management

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f webhook-service

# Last 100 lines
docker compose logs --tail=100 config-api
```

### Restart Services

```bash
# Restart single service
docker compose restart config-api

# Restart all services
docker compose restart
```

### Rebuild Single Service

```bash
# Rebuild and restart admin-ui
docker compose build --no-cache admin-ui
docker compose up -d admin-ui
```

### Stop and Remove

```bash
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes database!)
docker compose down -v
```

## Database Management

### Access Database

```bash
# Connect to PostgreSQL
docker exec -it splunk-webhook-db psql -U webhook_user -d webhook_admin
```

### Backup Database

```bash
# Create backup
docker exec splunk-webhook-db pg_dump -U webhook_user webhook_admin > backup.sql

# Restore backup
docker exec -i splunk-webhook-db psql -U webhook_user webhook_admin < backup.sql
```

### Reset Database

```bash
# WARNING: This deletes all data!
docker compose down -v
docker compose up -d
```

## Cleanup

### Remove Unused Images

```bash
# Prune dangling images
docker image prune -f

# Remove all unused images
docker image prune -a -f
```

### Full Cleanup

```bash
# Stop services
docker compose down

# Remove volumes
docker volume rm splunk_weberhook_servicenow_postgres_data

# Remove images
docker rmi $(docker images -q splunk_weberhook_servicenow*)
```

## Production Considerations

### Security

1. **Change default credentials**:
   - Update admin password after first login
   - Generate unique ENCRYPTION_KEY and JWT_SECRET

2. **Network security**:
   - Use firewall rules to restrict access
   - Consider reverse proxy (nginx) with HTTPS

3. **Database security**:
   - Use strong database password
   - Restrict database access to internal network

### Performance

1. **Gunicorn workers**: Adjust in `webhook-service/Dockerfile`:
   ```dockerfile
   CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app.main:app"]
   ```

2. **Database connections**: Default pool size is sufficient for most deployments

### Monitoring

1. **Health endpoints**:
   - Config API: `GET /health`
   - Webhook Service: `GET /health`

2. **Logs**:
   - Enable log aggregation (ELK, Loki, etc.)
   - Monitor for errors in webhook_logs table

### Backup Strategy

1. **Database**: Daily backups with pg_dump
2. **Configuration**: Keep .env files in secure location (not in git)
3. **Volumes**: Regular backup of postgres_data volume

## Splunk Configuration

### Create Webhook Alert Action

In Splunk, configure an alert to send webhooks to this service:

1. Go to **Settings > Alert Actions**
2. Create new **Webhook** action
3. Configure:
   - **URL**: `http://<server-ip>:5001/webhook`
   - **Method**: POST
   - **Content-Type**: application/json

### Payload Format

Configure Splunk to send alerts in this format:

```json
{
  "result": {
    "mnemonic": "$result.mnemonic$",
    "host": "$result.host$",
    "vendor": "$result.vendor$",
    "message_text": "$result._raw$"
  }
}
```

### Example Search

```spl
index=network sourcetype=syslog
| eval mnemonic=case(
    match(_raw, "DUP_SRC_IP"), "DUP_SRC_IP",
    match(_raw, "LINK-3-UPDOWN"), "LINK_DOWN",
    match(_raw, "BGP.*DOWN"), "BGP_PEER_DOWN"
  )
| where isnotnull(mnemonic)
| table mnemonic, host, vendor, _raw
| rename _raw as message_text
```
