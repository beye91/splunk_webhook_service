# User Guide

## Getting Started

### Accessing the Admin UI

1. Open your browser and navigate to: `http://localhost:3000`
2. You will be redirected to the login page

### Login

- **Default Username**: admin
- **Default Password**: Admin123!

After logging in, you will see the Dashboard.

## Navigation

The sidebar provides access to all features:

```
┌─────────────────────┐
│  Webhook Admin      │
├─────────────────────┤
│  Dashboard          │  Overview and statistics
│  LLM Providers      │  Configure AI models
│  Alert Types        │  Manage alert mnemonics
│  ServiceNow         │  Configure incident creation
│  Email/SMTP         │  Configure email notifications
│  Test Webhook       │  Send test alerts
│  Logs               │  View processing history
├─────────────────────┤
│  Logout             │
└─────────────────────┘
```

## Dashboard

The Dashboard provides an overview of:

- **Total Webhooks**: Count of processed webhooks
- **Status Breakdown**: Completed, failed, ignored, processing
- **By Mnemonic**: Distribution across alert types
- **Recent Activity**: Last 10 webhook logs

## LLM Providers

Configure AI models for intelligent error analysis.

### Adding an OpenAI Provider

1. Click **"Add Provider"**
2. Fill in the form:
   - **Name**: Display name (e.g., "OpenAI GPT-4o Mini")
   - **Provider Type**: Select "OpenAI"
   - **API Key**: Your OpenAI API key
   - **Model**: Model ID (e.g., "gpt-4o-mini-2024-07-18")
   - **Max Tokens**: Maximum response length (default: 1000)
   - **Temperature**: Creativity level 0.0-1.0 (default: 0.7)
   - **Enabled**: Check to activate
   - **Default**: Check to use as default provider
3. Click **"Create"**

### Adding an Ollama Provider

1. Click **"Add Provider"**
2. Fill in the form:
   - **Name**: Display name (e.g., "Local Ollama")
   - **Provider Type**: Select "Ollama"
   - **Ollama Host**: Server hostname (e.g., "10.48.54.81")
   - **Ollama Port**: Server port (default: 11434)
   - **Model**: Model name (e.g., "llama3.1")
   - **Max Tokens**: Maximum response length
   - **Temperature**: Creativity level
3. Click **"Create"**

### Testing a Provider

1. Click the **play icon** on a provider card
2. View the test result (success/failure with response time)

### Setting Default Provider

1. Click the **star icon** on a provider card
2. This provider will be used when alert types don't specify one

## Alert Types

Configure which alert mnemonics to process and how.

### Creating an Alert Type

1. Click **"Add Alert Type"**
2. Fill in the form:
   - **Mnemonic**: Unique identifier (e.g., "DUP_SRC_IP")
   - **Display Name**: Human-readable name
   - **Description**: What this alert means
   - **LLM Provider**: Select specific or "Use Default"
   - **Severity**: low/medium/high/critical
   - **Urgency**: ServiceNow urgency level (1-3)
   - **LLM Prompt**: Custom instructions for the AI
   - **Enabled**: Check to process this alert type
   - **Use LLM**: Check to enable AI analysis
   - **Create ServiceNow Ticket**: Enable ticket creation
   - **Send Email**: Enable email notifications
3. Click **"Create"**

### Managing Notifications

Each alert type can have multiple notification channels.

1. Click the **bell icon** on an alert type card
2. In the modal, click **"Add Notification Channel"**
3. Choose channel type:

#### Email (SMTP) Channel

1. Select **"Email (SMTP)"**
2. Choose your SMTP server
3. Add recipients:
   - Enter email address
   - Enter name (optional)
   - Select type: To, CC, or BCC
   - Click the **+** button
4. Click **"Add Channel"**

#### ServiceNow Channel

1. Select **"ServiceNow Ticket"**
2. Choose your ServiceNow instance
3. Click **"Add Channel"**

### Enabling/Disabling Alert Types

- Click the **power icon** to toggle enabled status
- Disabled alert types will be ignored when webhooks arrive

## ServiceNow Configuration

Configure ServiceNow instances for ticket creation.

### Adding a ServiceNow Instance

1. Click **"Add ServiceNow Instance"**
2. Fill in the form:
   - **Name**: Display name
   - **Instance URL**: Full URL (e.g., "https://dev12345.service-now.com")
   - **Username**: Service account username
   - **Password**: Service account password
   - **Default Caller**: Default caller_id for tickets
   - **Default Assignment Group**: Group to assign tickets
   - **Default Category**: Ticket category
   - **Enabled**: Check to activate
   - **Default**: Check to use as default
3. Click **"Create"**

### Testing Connection

1. Click the **play icon** on a configuration card
2. View the test result (verifies API authentication)

## Email/SMTP Configuration

Configure SMTP servers for email notifications.

### Adding an SMTP Server

1. Click **"Add SMTP Server"**
2. Fill in the form:
   - **Configuration Name**: Display name
   - **SMTP Host**: Server hostname
   - **Port**: SMTP port (587 for TLS, 465 for SSL)
   - **Use TLS (STARTTLS)**: Recommended for port 587
   - **Use SSL**: For port 465
   - **Username**: SMTP authentication username
   - **Password**: SMTP authentication password
   - **From Address**: Sender email
   - **From Name**: Sender display name
   - **Enabled**: Check to activate
   - **Default Configuration**: Check to use as default
3. Click **"Update"** or **"Create"**

### Testing Email

1. Enter a test email address in the input field
2. Click the **play icon** on a configuration card
3. Check your inbox for the test email

## Test Webhook

Manually trigger the webhook pipeline without waiting for actual alerts.

### Sending a Test

1. Navigate to **Test Webhook**
2. Fill in the form:
   - **Alert Type (Mnemonic)**: Select from enabled types
   - **Host / Device Name**: Test hostname
   - **Vendor**: Select device vendor
   - **Error Message**: Paste syslog content
3. Click **"Send Test Webhook"**
4. View results:
   - Success/failure status
   - ServiceNow ticket number (if created)
   - Email sent status
   - Processing time
5. Click **"View Log Details"** to see full log entry

### What Happens During Test

1. Webhook service receives the test payload
2. LLM analyzes the error message (if enabled)
3. ServiceNow ticket is created (if configured)
4. Email is sent to recipients (if configured)
5. Results are logged in the database

## Logs

View and filter webhook processing history.

### Filtering Logs

Use the filter options:
- **Status**: All, Completed, Failed, Ignored, Processing
- **Mnemonic**: Filter by alert type
- **Date Range**: Filter by time period

### Log Entry Details

Click on a log entry to view:
- **Request**: Original payload, headers, source IP
- **Processing**: LLM response, response time
- **Results**: Ticket number, email status
- **Errors**: Error messages if failed

### Status Meanings

| Status | Description |
|--------|-------------|
| Completed | Successfully processed |
| Failed | Error during processing |
| Ignored | Mnemonic not configured |
| Processing | Currently being processed |
| Received | Awaiting processing |

## Best Practices

### LLM Prompts

Write effective prompts:

```
You are a helpful networking engineer. You will receive an error
message about [specific issue] and need to provide:

1. Brief explanation of the error
2. Likely root causes
3. Step-by-step troubleshooting procedure
4. Commands to run for diagnosis

Keep the response concise and actionable.
```

### Alert Type Naming

Use consistent mnemonic patterns:
- `DUP_SRC_IP` - Duplicate source IP
- `LINK_DOWN` - Interface link down
- `BGP_PEER_DOWN` - BGP session down
- `HIGH_CPU` - CPU threshold exceeded
- `CONFIG_CHANGE` - Configuration modified

### Email Recipients

Organize recipients effectively:
- **To**: Primary responders
- **CC**: Team leads, documentation
- **BCC**: Audit/compliance

### ServiceNow Integration

Configure defaults:
- **Caller ID**: Automation service account
- **Assignment Group**: First-level support
- **Category**: Network or appropriate CMDB category

## Troubleshooting

### Login Issues

1. Check username/password
2. Clear browser cookies
3. Verify Config API is running: `docker compose ps`

### No Notifications Sent

1. Check alert type has "Send Email" enabled
2. Verify notification channels are configured
3. Check SMTP server is enabled and tested
4. View logs for error messages

### LLM Not Working

1. Check LLM provider is enabled
2. Verify API key is configured (for OpenAI)
3. Test provider connection
4. Check alert type has "Use LLM" enabled

### ServiceNow Tickets Not Created

1. Check alert type has notification channel for ServiceNow
2. Verify ServiceNow instance credentials
3. Test ServiceNow connection
4. Check logs for API errors

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more detailed solutions.
