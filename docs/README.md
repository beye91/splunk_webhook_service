# Splunk Webhook Admin Platform

A microservices-based platform for managing Splunk webhook integrations with ServiceNow incident management and email notifications, powered by LLM analysis (OpenAI or Ollama).

## Architecture Overview

```
                                    SPLUNK WEBHOOK ADMIN PLATFORM
    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                                                                                 │
    │   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                    │
    │   │   Splunk    │      │   Admin UI  │      │  External   │                    │
    │   │   Alerts    │      │  (Next.js)  │      │   Systems   │                    │
    │   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘                    │
    │          │                    │                    │                            │
    │          │ POST /webhook      │ REST API           │                            │
    │          ▼                    ▼                    │                            │
    │   ┌─────────────┐      ┌─────────────┐            │                            │
    │   │   Webhook   │      │  Config API │            │                            │
    │   │   Service   │◄────►│  (FastAPI)  │            │                            │
    │   │   (Flask)   │      │  Port 8000  │            │                            │
    │   │  Port 5001  │      └──────┬──────┘            │                            │
    │   └──────┬──────┘             │                   │                            │
    │          │                    │                   │                            │
    │          │        ┌───────────┴───────────┐       │                            │
    │          │        │                       │       │                            │
    │          ▼        ▼                       ▼       ▼                            │
    │   ┌─────────────────┐           ┌─────────────────────┐                        │
    │   │   PostgreSQL    │           │   ServiceNow API    │                        │
    │   │   Port 5433     │           │   SMTP Server       │                        │
    │   │   (Database)    │           │   OpenAI / Ollama   │                        │
    │   └─────────────────┘           └─────────────────────┘                        │
    │                                                                                 │
    └─────────────────────────────────────────────────────────────────────────────────┘
```

## Features

- **Alert Type Management**: Configure mnemonics (DUP_SRC_IP, LINK_DOWN, BGP_PEER_DOWN, etc.) with custom LLM prompts
- **LLM Integration**: OpenAI GPT models or local Ollama for intelligent error analysis
- **ServiceNow Tickets**: Automatic incident creation with LLM-generated recommendations
- **Email Notifications**: SMTP-based alerts with configurable recipients (to/cc/bcc)
- **Notification Channels**: Multiple notification methods per alert type
- **Test Webhook**: Manual testing without waiting for actual alerts
- **Audit Logging**: Complete request/response logging with filtering
- **Web Admin UI**: Modern Next.js dashboard for configuration management

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Deployment

```bash
# Clone the repository
git clone <repository-url>
cd splunk_weberhook_serviceNow

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# - Set ENCRYPTION_KEY (generate with: openssl rand -base64 32)
# - Set JWT_SECRET
# - Configure database credentials

# Start all services
docker compose up -d --build

# Access the Admin UI
open http://localhost:3000
```

### Default Login
- **Username**: admin
- **Password**: Admin123!

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](ARCHITECTURE.md) | System design, data flow, database schema |
| [Installation](INSTALLATION.md) | Deployment guide for local and remote servers |
| [Configuration](CONFIGURATION.md) | Environment variables and settings reference |
| [API Reference](API.md) | REST API endpoints for both services |
| [User Guide](USER_GUIDE.md) | Admin UI walkthrough and usage |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and solutions |
| [Development](DEVELOPMENT.md) | Local setup and contributing guidelines |

## Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5433 | Database (credentials encrypted) |
| Config API | 8000 | FastAPI - Configuration management |
| Webhook Service | 5001 | Flask - Webhook processing |
| Admin UI | 3000 | Next.js - Web interface |

## Webhook Payload Format

Splunk should send alerts in this format:

```json
{
  "result": {
    "mnemonic": "DUP_SRC_IP",
    "host": "switch-core-01.lab.local",
    "vendor": "Cisco",
    "message_text": "Duplicate source IP 10.0.0.1 detected on interface Gi0/1"
  }
}
```

## Processing Flow

```
1. Splunk Alert → POST /webhook
2. Parse & Validate payload
3. Lookup AlertType by mnemonic
4. LLM Analysis (if enabled)
   └─ Generate troubleshooting recommendations
5. Create Notifications
   ├─ ServiceNow Ticket
   └─ Email to recipients
6. Log results in database
7. Return response to Splunk
```

## Tech Stack

- **Backend**: Python 3.12 (FastAPI, Flask, SQLAlchemy)
- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Database**: PostgreSQL 15
- **LLM**: OpenAI API, Ollama
- **Containerization**: Docker, Docker Compose

## License

MIT License

## Support

For issues and feature requests, please open a GitHub issue.
