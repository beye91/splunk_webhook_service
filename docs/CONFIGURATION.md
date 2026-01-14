# Configuration Reference

## Environment Variables

All configuration is managed through environment variables in the `.env` file.

### Database Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_DB` | Yes | - | Database name |
| `POSTGRES_USER` | Yes | - | Database username |
| `POSTGRES_PASSWORD` | Yes | - | Database password |
| `POSTGRES_PORT` | No | 5432 | External port mapping |

Example:
```bash
POSTGRES_DB=webhook_admin
POSTGRES_USER=webhook_user
POSTGRES_PASSWORD=SecurePassword123!
POSTGRES_PORT=5433
```

### Security Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENCRYPTION_KEY` | Yes | - | Fernet key for encrypting credentials |
| `JWT_SECRET` | Yes | - | Secret for signing JWT tokens |
| `JWT_ALGORITHM` | No | HS256 | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | No | 1440 | Token expiry (24 hours) |

#### Generating Keys

```bash
# Generate encryption key (32 bytes, base64 encoded)
openssl rand -base64 32

# Generate JWT secret
openssl rand -hex 32
```

### Service Ports

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONFIG_API_PORT` | No | 8000 | Config API external port |
| `WEBHOOK_PORT` | No | 5001 | Webhook service external port |
| `ADMIN_UI_PORT` | No | 3000 | Admin UI external port |

### CORS Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGINS` | No | http://localhost:3000 | Allowed origins (comma-separated) |

Example:
```bash
CORS_ORIGINS=http://localhost:3000,http://192.168.1.213:3000
```

### Admin UI Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Config API URL for frontend |

Example:
```bash
# Local development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Remote server
NEXT_PUBLIC_API_URL=http://192.168.1.213:8000
```

### Internal Service URLs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Auto | - | PostgreSQL connection string |
| `WEBHOOK_SERVICE_URL` | No | http://webhook-service:5000 | Internal webhook URL |

## Complete .env Example

```bash
# ===========================================
# Splunk Webhook Admin Platform Configuration
# ===========================================

# Database
POSTGRES_DB=webhook_admin
POSTGRES_USER=webhook_user
POSTGRES_PASSWORD=WebhookAdmin2024!
POSTGRES_PORT=5433

# Security (GENERATE NEW VALUES FOR PRODUCTION!)
ENCRYPTION_KEY=K7gHnJkL9mNpQrStUvWxYz1234567890ABCDEFGH=
JWT_SECRET=your-super-secret-jwt-key-change-this

# Service Ports
CONFIG_API_PORT=8000
WEBHOOK_PORT=5001
ADMIN_UI_PORT=3000

# CORS Origins
CORS_ORIGINS=http://localhost:3000

# Admin UI API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Docker Compose Configuration

### Service-Specific Environment

Each service receives environment variables from Docker Compose:

#### PostgreSQL
```yaml
postgres:
  environment:
    POSTGRES_DB: ${POSTGRES_DB}
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

#### Config API
```yaml
config-api:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    JWT_SECRET: ${JWT_SECRET}
    CORS_ORIGINS: ${CORS_ORIGINS}
    WEBHOOK_SERVICE_URL: http://webhook-service:5000
```

#### Webhook Service
```yaml
webhook-service:
  environment:
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
    ENCRYPTION_KEY: ${ENCRYPTION_KEY}
```

#### Admin UI
```yaml
admin-ui:
  environment:
    NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
```

## Application Configuration

### LLM Provider Settings

Configure via Admin UI or database:

#### OpenAI
| Setting | Default | Description |
|---------|---------|-------------|
| `provider_type` | openai | Provider identifier |
| `api_key_encrypted` | - | Encrypted API key |
| `openai_model` | gpt-4o-mini-2024-07-18 | Model ID |
| `max_tokens` | 1000 | Maximum response tokens |
| `temperature` | 0.7 | Creativity (0.0-1.0) |

#### Ollama
| Setting | Default | Description |
|---------|---------|-------------|
| `provider_type` | ollama | Provider identifier |
| `ollama_host` | - | Ollama server hostname |
| `ollama_port` | 11434 | Ollama server port |
| `ollama_model` | llama3.1 | Model name |
| `max_tokens` | 1000 | Maximum response tokens |
| `temperature` | 0.7 | Creativity (0.0-1.0) |

### ServiceNow Settings

Configure via Admin UI:

| Setting | Description |
|---------|-------------|
| `instance_url` | ServiceNow instance URL (e.g., https://dev12345.service-now.com) |
| `username_encrypted` | Encrypted service account username |
| `password_encrypted` | Encrypted service account password |
| `default_caller_id` | Default caller for tickets |
| `default_assignment_group` | Default assignment group |
| `default_category` | Default ticket category |

### SMTP Settings

Configure via Admin UI:

| Setting | Default | Description |
|---------|---------|-------------|
| `smtp_host` | - | SMTP server hostname |
| `smtp_port` | 587 | SMTP port |
| `use_tls` | true | Enable STARTTLS |
| `use_ssl` | false | Enable SSL/TLS |
| `username_encrypted` | - | Encrypted SMTP username |
| `password_encrypted` | - | Encrypted SMTP password |
| `from_address` | - | Sender email address |
| `from_name` | - | Sender display name |

### Alert Type Settings

Configure via Admin UI:

| Setting | Default | Description |
|---------|---------|-------------|
| `mnemonic` | - | Unique alert identifier (e.g., DUP_SRC_IP) |
| `display_name` | - | Human-readable name |
| `description` | - | Alert description |
| `enabled` | true | Process this alert type |
| `use_llm` | true | Enable LLM analysis |
| `llm_provider_id` | null | Specific provider or default |
| `llm_prompt` | - | Custom system prompt |
| `severity` | medium | low/medium/high/critical |
| `urgency` | 2 | ServiceNow urgency (1-3) |

## Database Schema Configuration

### Default Values

The database schema defines these defaults:

```sql
-- LLM Providers
openai_model VARCHAR(100) DEFAULT 'gpt-4o-mini-2024-07-18'
ollama_port INTEGER DEFAULT 11434
ollama_model VARCHAR(100) DEFAULT 'llama3.1'
max_tokens INTEGER DEFAULT 1000
temperature VARCHAR(10) DEFAULT '0.7'

-- SMTP
smtp_port INTEGER DEFAULT 587
use_tls BOOLEAN DEFAULT TRUE
use_ssl BOOLEAN DEFAULT FALSE

-- Alert Types
severity VARCHAR(20) DEFAULT 'medium'
urgency VARCHAR(10) DEFAULT '2'

-- Webhook Logs
status VARCHAR(50) DEFAULT 'received'
```

## Seed Data

Initial data loaded from `init-scripts/02_seed_data.sql`:

### Default Admin User
- **Username**: admin
- **Password**: Admin123! (bcrypt hashed)
- **Role**: admin

### Sample Alert Types
- DUP_SRC_IP (Duplicate Source IP)
- LINK_DOWN (Interface Link Down)
- CONFIG_CHANGE (Configuration Change)
- HIGH_CPU (High CPU Utilization)
- BGP_PEER_DOWN (BGP Peer Session Down)

### Sample LLM Providers
- AI-POD (Ollama, if configured)
- OpenAI GPT-4o Mini (requires API key)

## Runtime Configuration

### Gunicorn (Webhook Service)

Configured in `webhook-service/Dockerfile`:

```dockerfile
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app.main:app"]
```

| Option | Value | Description |
|--------|-------|-------------|
| `-w 4` | 4 workers | Concurrent request handling |
| `-b 0.0.0.0:5000` | Bind address | Listen on all interfaces |
| `--timeout 120` | 120 seconds | Request timeout (for LLM) |

### Uvicorn (Config API)

Configured in `config-api/Dockerfile`:

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Next.js (Admin UI)

Standalone output mode for Docker:

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
}
```
