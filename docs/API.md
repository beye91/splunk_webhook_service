# API Reference

## Overview

The platform exposes two REST APIs:

1. **Config API** (FastAPI) - Configuration management, authentication
2. **Webhook Service** (Flask) - Webhook processing

## Config API

Base URL: `http://localhost:8000/api/v1`

OpenAPI Documentation: `http://localhost:8000/docs`

### Authentication

All endpoints (except login) require JWT authentication.

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=Admin123!
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Current User

```http
GET /api/v1/auth/me
Authorization: Bearer {token}
```

Response:
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "is_active": true,
  "last_login": "2024-01-14T10:30:00Z"
}
```

### LLM Providers

#### List Providers

```http
GET /api/v1/llm-providers
Authorization: Bearer {token}
```

Response:
```json
[
  {
    "id": 1,
    "name": "OpenAI GPT-4o Mini",
    "provider_type": "openai",
    "openai_model": "gpt-4o-mini-2024-07-18",
    "ollama_host": null,
    "ollama_port": null,
    "ollama_model": null,
    "max_tokens": 1000,
    "temperature": "0.7",
    "enabled": true,
    "is_default": true,
    "has_api_key": true,
    "created_at": "2024-01-14T10:00:00Z",
    "updated_at": "2024-01-14T10:00:00Z"
  }
]
```

#### Create Provider

```http
POST /api/v1/llm-providers
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "OpenAI GPT-4",
  "provider_type": "openai",
  "api_key": "sk-...",
  "openai_model": "gpt-4",
  "max_tokens": 2000,
  "temperature": "0.7",
  "enabled": true,
  "is_default": false
}
```

#### Update Provider

```http
PUT /api/v1/llm-providers/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "enabled": false
}
```

#### Delete Provider

```http
DELETE /api/v1/llm-providers/{id}
Authorization: Bearer {token}
```

#### Test Provider

```http
POST /api/v1/llm-providers/{id}/test
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "message": "Connection successful",
  "details": {
    "response": "Test response from LLM",
    "response_time_ms": 1234
  }
}
```

### ServiceNow Configs

#### List Configs

```http
GET /api/v1/servicenow-configs
Authorization: Bearer {token}
```

Response:
```json
[
  {
    "id": 1,
    "name": "Production Instance",
    "instance_url": "https://dev12345.service-now.com",
    "default_caller_id": "admin",
    "default_assignment_group": "Network Support",
    "default_category": "Network",
    "enabled": true,
    "is_default": true,
    "created_at": "2024-01-14T10:00:00Z",
    "updated_at": "2024-01-14T10:00:00Z"
  }
]
```

#### Create Config

```http
POST /api/v1/servicenow-configs
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Production Instance",
  "instance_url": "https://dev12345.service-now.com",
  "username": "api_user",
  "password": "api_password",
  "default_caller_id": "admin",
  "default_assignment_group": "Network Support",
  "enabled": true
}
```

#### Test Connection

```http
POST /api/v1/servicenow-configs/{id}/test
Authorization: Bearer {token}
```

### SMTP Configs

#### List Configs

```http
GET /api/v1/smtp-configs
Authorization: Bearer {token}
```

Response:
```json
[
  {
    "id": 1,
    "name": "Company SMTP",
    "smtp_host": "smtp.example.com",
    "smtp_port": 587,
    "use_tls": true,
    "use_ssl": false,
    "from_address": "alerts@example.com",
    "from_name": "Network Alerts",
    "enabled": true,
    "is_default": true,
    "has_credentials": true,
    "created_at": "2024-01-14T10:00:00Z",
    "updated_at": "2024-01-14T10:00:00Z"
  }
]
```

#### Create Config

```http
POST /api/v1/smtp-configs
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Company SMTP",
  "smtp_host": "smtp.example.com",
  "smtp_port": 587,
  "use_tls": true,
  "use_ssl": false,
  "username": "smtp_user",
  "password": "smtp_password",
  "from_address": "alerts@example.com",
  "from_name": "Network Alerts",
  "enabled": true
}
```

#### Test Email

```http
POST /api/v1/smtp-configs/{id}/test?test_email=user@example.com
Authorization: Bearer {token}
```

### Alert Types

#### List Alert Types

```http
GET /api/v1/alert-types
Authorization: Bearer {token}
```

Response:
```json
[
  {
    "id": 1,
    "mnemonic": "DUP_SRC_IP",
    "display_name": "Duplicate Source IP",
    "description": "Duplicate source IP address detected",
    "enabled": true,
    "use_llm": true,
    "llm_provider_id": 1,
    "llm_prompt": "You are a networking engineer...",
    "create_servicenow_ticket": true,
    "send_email": true,
    "severity": "high",
    "urgency": "2",
    "llm_provider_name": "OpenAI GPT-4o Mini",
    "created_at": "2024-01-14T10:00:00Z",
    "updated_at": "2024-01-14T10:00:00Z"
  }
]
```

#### Create Alert Type

```http
POST /api/v1/alert-types
Authorization: Bearer {token}
Content-Type: application/json

{
  "mnemonic": "NEW_ALERT",
  "display_name": "New Alert Type",
  "description": "Description of the alert",
  "enabled": true,
  "use_llm": true,
  "llm_provider_id": null,
  "llm_prompt": "You are a networking engineer...",
  "severity": "medium",
  "urgency": "2"
}
```

#### Toggle Alert Type

```http
POST /api/v1/alert-types/{id}/toggle
Authorization: Bearer {token}
```

#### Get Notifications for Alert Type

```http
GET /api/v1/alert-types/{id}/notifications
Authorization: Bearer {token}
```

Response:
```json
[
  {
    "id": 1,
    "alert_type_id": 1,
    "notification_type": "smtp",
    "servicenow_config_id": null,
    "smtp_config_id": 1,
    "enabled": true,
    "email_recipients": [
      {
        "id": 1,
        "email": "admin@example.com",
        "recipient_name": "Admin",
        "recipient_type": "to"
      }
    ],
    "servicenow_config_name": null,
    "smtp_config_name": "Company SMTP"
  }
]
```

#### Create Notification

```http
POST /api/v1/alert-types/{id}/notifications
Authorization: Bearer {token}
Content-Type: application/json

{
  "notification_type": "smtp",
  "smtp_config_id": 1,
  "enabled": true,
  "email_recipients": [
    {
      "email": "admin@example.com",
      "recipient_name": "Admin",
      "recipient_type": "to"
    },
    {
      "email": "team@example.com",
      "recipient_name": "Team",
      "recipient_type": "cc"
    }
  ]
}
```

### Webhook Logs

#### List Logs

```http
GET /api/v1/webhook-logs?limit=50&offset=0&status=completed&mnemonic=DUP_SRC_IP
Authorization: Bearer {token}
```

Query Parameters:
- `limit` (int): Number of records (default: 50)
- `offset` (int): Skip records (default: 0)
- `status` (string): Filter by status
- `mnemonic` (string): Filter by mnemonic

Response:
```json
[
  {
    "id": 1,
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "received_at": "2024-01-14T10:30:00Z",
    "source_ip": "10.0.0.1",
    "mnemonic": "DUP_SRC_IP",
    "host": "switch-01.lab.local",
    "vendor": "Cisco",
    "message_text": "Duplicate IP detected...",
    "llm_provider_name": "OpenAI GPT-4o Mini",
    "llm_response": "Troubleshooting steps...",
    "llm_response_time_ms": 1500,
    "servicenow_ticket_number": "INC0012345",
    "email_sent": true,
    "status": "completed",
    "error_message": null,
    "processing_time_ms": 3500,
    "completed_at": "2024-01-14T10:30:03Z"
  }
]
```

#### Get Log Details

```http
GET /api/v1/webhook-logs/{id}
Authorization: Bearer {token}
```

#### Get Statistics

```http
GET /api/v1/webhook-logs/stats?days=7
Authorization: Bearer {token}
```

Response:
```json
{
  "total_count": 150,
  "received_count": 5,
  "processing_count": 2,
  "completed_count": 140,
  "failed_count": 3,
  "ignored_count": 0,
  "by_mnemonic": {
    "DUP_SRC_IP": 50,
    "LINK_DOWN": 45,
    "BGP_PEER_DOWN": 30,
    "HIGH_CPU": 25
  },
  "by_status": {
    "completed": 140,
    "received": 5,
    "processing": 2,
    "failed": 3
  }
}
```

### Test Webhook

```http
POST /api/v1/webhook/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "mnemonic": "DUP_SRC_IP",
  "host": "switch-01.lab.local",
  "vendor": "Cisco",
  "message_text": "Duplicate source IP 10.0.0.1 detected on interface Gi0/1"
}
```

Response:
```json
{
  "success": true,
  "message": "Test webhook processed successfully",
  "details": {
    "mnemonic": "DUP_SRC_IP",
    "host": "switch-01.lab.local",
    "ticket_created": true,
    "ticket_number": "INC0012345",
    "email_sent": true,
    "processing_time_ms": 3500,
    "log_id": 42
  }
}
```

## Webhook Service

Base URL: `http://localhost:5001`

### Main Webhook Endpoint

```http
POST /webhook
Content-Type: application/json

{
  "result": {
    "mnemonic": "DUP_SRC_IP",
    "host": "switch-01.lab.local",
    "vendor": "Cisco",
    "message_text": "Duplicate source IP 10.0.0.1 detected on interface Gi0/1"
  }
}
```

Response (Success):
```json
{
  "status": "processed",
  "mnemonic": "DUP_SRC_IP",
  "host": "switch-01.lab.local",
  "ticket_created": true,
  "ticket_number": "INC0012345",
  "email_sent": true,
  "notifications_count": 2,
  "processing_time_ms": 3500,
  "log_id": 42
}
```

Response (Mnemonic Not Configured):
```json
{
  "response": "mnemonic_not_configured",
  "ticket_created": false
}
```

### Echo Endpoint (Debug)

```http
POST /webhook/echo
Content-Type: application/json

{
  "test": "data"
}
```

Response:
```json
{
  "echo": {"test": "data"},
  "received_at": "2024-01-14T10:30:00Z",
  "headers": {...},
  "remote_addr": "10.0.0.1"
}
```

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "uptime_seconds": 12345
}
```

### Info Page

```http
GET /webhook
```

Returns HTML info page with endpoint documentation.

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Invalid payload structure - missing 'result' key"
}
```

### 401 Unauthorized

```json
{
  "detail": "Could not validate credentials"
}
```

### 404 Not Found

```json
{
  "detail": "Alert type not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Database connection failed"
}
```

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

## Webhook Processing Statuses

| Status | Description |
|--------|-------------|
| `received` | Webhook received, not yet processed |
| `processing` | Currently being processed |
| `completed` | Successfully processed |
| `failed` | Processing failed (check error_message) |
| `ignored` | Mnemonic not configured or disabled |
