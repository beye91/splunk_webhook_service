# Architecture

## System Overview

The Splunk Webhook Admin Platform is a microservices-based system with four containerized services communicating over a Docker bridge network.

```
                              DOCKER NETWORK (webhook-network)
    ┌──────────────────────────────────────────────────────────────────────────────┐
    │                                                                              │
    │  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐             │
    │  │   Admin UI     │    │   Config API   │    │ Webhook Service│             │
    │  │   (Next.js)    │    │   (FastAPI)    │    │   (Flask)      │             │
    │  │                │    │                │    │                │             │
    │  │  Port: 3000    │───▶│  Port: 8000    │◀───│  Port: 5000    │             │
    │  │  (external)    │JWT │  (external)    │    │  Port: 5001    │             │
    │  │                │    │                │    │  (external)    │             │
    │  └────────────────┘    └───────┬────────┘    └───────┬────────┘             │
    │                                │                     │                       │
    │                                │ SQLAlchemy          │ SQLAlchemy            │
    │                                ▼                     ▼                       │
    │                        ┌─────────────────────────────────────┐              │
    │                        │           PostgreSQL 15             │              │
    │                        │          Port: 5432/5433            │              │
    │                        │                                     │              │
    │                        │  ┌─────────┐ ┌─────────┐ ┌───────┐ │              │
    │                        │  │  users  │ │ configs │ │ logs  │ │              │
    │                        │  └─────────┘ └─────────┘ └───────┘ │              │
    │                        └─────────────────────────────────────┘              │
    │                                                                              │
    └──────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           │ External APIs
                                           ▼
                    ┌────────────────────────────────────────────────┐
                    │                                                │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
                    │  │ OpenAI   │  │ServiceNow│  │ SMTP Server  │ │
                    │  │   API    │  │   API    │  │              │ │
                    │  └──────────┘  └──────────┘  └──────────────┘ │
                    │                                                │
                    │        OR                                      │
                    │                                                │
                    │  ┌──────────┐                                  │
                    │  │  Ollama  │                                  │
                    │  │ (Local)  │                                  │
                    │  └──────────┘                                  │
                    └────────────────────────────────────────────────┘
```

## Service Components

### 1. PostgreSQL Database

**Purpose**: Persistent storage for all configuration and logs

**Key Tables**:
- `users` - Admin/editor/viewer accounts
- `llm_providers` - OpenAI and Ollama configurations
- `servicenow_configs` - ServiceNow instance credentials
- `smtp_configs` - Email server settings
- `alert_types` - Mnemonic to notification mappings
- `alert_notifications` - Notification channel assignments
- `email_recipients` - Email recipient lists
- `webhook_logs` - Complete audit trail
- `audit_logs` - Configuration change history

**Security**: Credentials encrypted with Fernet before storage

### 2. Config API (FastAPI)

**Purpose**: Configuration management and authentication

**Responsibilities**:
- JWT-based user authentication
- CRUD operations for all configurations
- Credential encryption/decryption
- Webhook log queries and statistics
- Test webhook proxy to webhook service

**Key Features**:
- Automatic OpenAPI documentation
- Pydantic validation
- Role-based access control

### 3. Webhook Service (Flask)

**Purpose**: Process incoming Splunk alerts

**Responsibilities**:
- Receive and validate webhook payloads
- Look up alert type configurations
- Call LLM for error analysis
- Create ServiceNow incidents
- Send email notifications
- Log all processing steps

**Key Features**:
- Gunicorn with 4 workers
- 120-second timeout for LLM calls
- Detailed logging middleware

### 4. Admin UI (Next.js)

**Purpose**: Web interface for administration

**Features**:
- Dashboard with statistics
- LLM provider management
- ServiceNow configuration
- SMTP/Email configuration
- Alert type management
- Notification channel setup
- Webhook testing
- Log viewing and filtering

## Data Flow

### Webhook Processing Flow

```
┌─────────────┐
│   Splunk    │
│   Alert     │
└──────┬──────┘
       │ POST /webhook
       │ {result: {mnemonic, host, vendor, message_text}}
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEBHOOK SERVICE                          │
├─────────────────────────────────────────────────────────────┤
│  1. Parse JSON payload                                      │
│  2. Create WebhookLog entry (status: received)              │
│  3. Validate required fields                                │
│  4. Query AlertType by mnemonic                             │
│     └─ If not found: return ignored                         │
│  5. Update log (status: processing)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    LLM PROCESSING                           │
├─────────────────────────────────────────────────────────────┤
│  If alert_type.use_llm = true:                              │
│  1. Get LLM provider (specific or default)                  │
│  2. Build context from error message                        │
│  3. Call OpenAI or Ollama API                               │
│  4. Store response and timing in log                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               NOTIFICATION DISPATCH                         │
├─────────────────────────────────────────────────────────────┤
│  For each AlertNotification:                                │
│                                                             │
│  ServiceNow:                                                │
│  ├─ Build short description: "{mnemonic} on {host}"         │
│  ├─ Build description with error + LLM solution             │
│  ├─ POST to ServiceNow /api/now/table/incident              │
│  └─ Store ticket number (INC0012345)                        │
│                                                             │
│  Email:                                                     │
│  ├─ Build subject with severity and mnemonic                │
│  ├─ Build body with error + LLM solution                    │
│  ├─ Send via SMTP to all recipients                         │
│  └─ Store send status                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESPONSE                                 │
├─────────────────────────────────────────────────────────────┤
│  1. Update log (status: completed)                          │
│  2. Calculate processing time                               │
│  3. Return JSON response:                                   │
│     {                                                       │
│       "status": "processed",                                │
│       "mnemonic": "DUP_SRC_IP",                             │
│       "ticket_created": true,                               │
│       "ticket_number": "INC0012345",                        │
│       "email_sent": true,                                   │
│       "processing_time_ms": 3500,                           │
│       "log_id": 42                                          │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Flow

```
┌─────────────┐                    ┌─────────────┐
│  Admin UI   │                    │ Config API  │
│  (Browser)  │                    │ (FastAPI)   │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ 1. POST /auth/login              │
       │ ────────────────────────────────▶│
       │                                  │ Validate credentials
       │◀──────────────────────────────── │ Return JWT token
       │         JWT Token                │
       │                                  │
       │ 2. GET /llm-providers            │
       │ ────────────────────────────────▶│
       │    Authorization: Bearer {JWT}   │ Verify JWT
       │                                  │ Query database
       │◀──────────────────────────────── │
       │         Provider list            │ Decrypt API keys
       │                                  │ (mask in response)
       │                                  │
       │ 3. POST /llm-providers           │
       │ ────────────────────────────────▶│
       │    {name, api_key, model, ...}   │ Validate input
       │                                  │ Encrypt API key
       │◀──────────────────────────────── │ Store in database
       │         Created provider         │
       │                                  │
```

## Database Schema

### Entity Relationship

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │  llm_providers  │       │servicenow_configs│
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ username        │       │ name            │       │ name            │
│ email           │       │ provider_type   │       │ instance_url    │
│ password_hash   │       │ api_key_encrypt │       │ username_encrypt│
│ role            │       │ openai_model    │       │ password_encrypt│
│ is_active       │       │ ollama_host     │       │ default_caller  │
│ last_login      │       │ ollama_model    │       │ assignment_group│
│ created_at      │       │ max_tokens      │       │ enabled         │
│ updated_at      │       │ temperature     │       │ is_default      │
└─────────────────┘       │ enabled         │       │ created_at      │
                          │ is_default      │       │ updated_at      │
                          │ created_at      │       └─────────────────┘
                          │ updated_at      │
                          └────────┬────────┘
                                   │
                                   │ llm_provider_id (FK)
                                   ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  smtp_configs   │       │  alert_types    │       │alert_notifications│
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │       │ id              │
│ name            │       │ mnemonic        │◀──────│ alert_type_id   │
│ smtp_host       │       │ display_name    │       │ notification_type│
│ smtp_port       │       │ description     │       │ servicenow_id   │
│ use_tls         │       │ enabled         │       │ smtp_config_id  │
│ use_ssl         │       │ use_llm         │       │ enabled         │
│ username_encrypt│       │ llm_provider_id │       │ created_at      │
│ password_encrypt│       │ llm_prompt      │       └────────┬────────┘
│ from_address    │       │ severity        │                │
│ from_name       │       │ urgency         │                │
│ enabled         │       │ created_at      │                │
│ is_default      │       │ updated_at      │                │
│ created_at      │       └─────────────────┘                │
│ updated_at      │                                          │
└─────────────────┘                                          │
                                                             │
                          ┌─────────────────┐                │
                          │ email_recipients│◀───────────────┘
                          ├─────────────────┤  alert_notification_id (FK)
                          │ id              │
                          │ alert_notif_id  │
                          │ email           │
                          │ recipient_name  │
                          │ recipient_type  │  (to/cc/bcc)
                          │ created_at      │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  webhook_logs   │       │   audit_logs    │
├─────────────────┤       ├─────────────────┤
│ id              │       │ id              │
│ request_id      │       │ timestamp       │
│ received_at     │       │ user_id         │
│ source_ip       │       │ username        │
│ request_headers │       │ action          │
│ request_body    │       │ entity_type     │
│ mnemonic        │       │ entity_id       │
│ alert_type_id   │       │ entity_name     │
│ host            │       │ old_values      │
│ vendor          │       │ new_values      │
│ message_text    │       │ ip_address      │
│ llm_provider_id │       └─────────────────┘
│ llm_response    │
│ llm_time_ms     │
│ ticket_number   │
│ servicenow_resp │
│ email_sent      │
│ email_response  │
│ status          │
│ error_message   │
│ processing_ms   │
│ completed_at    │
└─────────────────┘
```

## Security Model

### Encryption

```
┌─────────────────────────────────────────────────────────────┐
│                    ENCRYPTION FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Input                    Database Storage             │
│  ──────────                    ────────────────             │
│                                                             │
│  API Key: sk-abc123...         gAAAAABm... (Fernet)         │
│       │                              ▲                      │
│       │ encrypt()                    │                      │
│       └──────────────────────────────┘                      │
│                                                             │
│  Retrieval (Admin UI)          Retrieval (Webhook Service)  │
│  ────────────────────          ──────────────────────────   │
│                                                             │
│  has_api_key: true             decrypt() → sk-abc123...     │
│  (masked in response)          (used for API calls)         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Authentication

```
┌─────────────────────────────────────────────────────────────┐
│                    JWT AUTHENTICATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Login Request                                           │
│     POST /auth/login                                        │
│     {username: "admin", password: "Admin123!"}              │
│                                                             │
│  2. Validation                                              │
│     - Query user by username                                │
│     - Verify bcrypt password hash                           │
│     - Check is_active = true                                │
│                                                             │
│  3. Token Generation                                        │
│     JWT payload: {sub: "admin", exp: now + 24h}             │
│     Signed with JWT_SECRET (HS256)                          │
│                                                             │
│  4. Token Storage                                           │
│     Stored in browser cookie: "token"                       │
│                                                             │
│  5. Subsequent Requests                                     │
│     Authorization: Bearer {token}                           │
│     - Decode and verify signature                           │
│     - Check expiration                                      │
│     - Load user from database                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Network Topology

### Docker Compose Network

```
┌─────────────────────────────────────────────────────────────┐
│                    webhook-network (bridge)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Internal DNS Resolution:                                   │
│  ─────────────────────────                                  │
│  postgres         → 172.18.0.2:5432                         │
│  config-api       → 172.18.0.3:8000                         │
│  webhook-service  → 172.18.0.4:5000                         │
│  admin-ui         → 172.18.0.5:3000                         │
│                                                             │
│  Port Mappings (host:container):                            │
│  ────────────────────────────────                           │
│  5433:5432   PostgreSQL                                     │
│  8000:8000   Config API                                     │
│  5001:5000   Webhook Service                                │
│  3000:3000   Admin UI                                       │
│                                                             │
│  Inter-Service Communication:                               │
│  ────────────────────────────                               │
│  admin-ui     → http://config-api:8000/api/v1              │
│  config-api   → http://webhook-service:5000/webhook        │
│  webhook-svc  → postgresql://postgres:5432/webhook_admin   │
│  config-api   → postgresql://postgres:5432/webhook_admin   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Gunicorn Configuration (Webhook Service)
- **Workers**: 4 (handles concurrent webhooks)
- **Timeout**: 120 seconds (allows for slow LLM responses)
- **Worker Class**: sync (sufficient for I/O-bound workload)

### Database Indexes
- `webhook_logs(received_at)` - Time-based queries
- `webhook_logs(mnemonic)` - Filter by alert type
- `webhook_logs(status)` - Filter by processing status
- `alert_types(mnemonic)` - Fast lookup during webhook processing
- `alert_types(enabled)` - Filter active types

### Caching
- LRU cache on `get_settings()` in Config API
- No additional caching (configurations rarely change)
