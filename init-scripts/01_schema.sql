-- Splunk Webhook Admin Platform - Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users table (for admin interface)
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LLM Providers (OpenAI or Ollama)
-- ============================================
CREATE TABLE llm_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('openai', 'ollama')),

    -- OpenAI specific
    api_key_encrypted TEXT,
    openai_model VARCHAR(100) DEFAULT 'gpt-4o-mini-2024-07-18',

    -- Ollama specific
    ollama_host VARCHAR(255),
    ollama_port INTEGER DEFAULT 11434,
    ollama_model VARCHAR(100) DEFAULT 'llama3.1',

    -- Common settings
    max_tokens INTEGER DEFAULT 1000,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    enabled BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ServiceNow Configuration
-- ============================================
CREATE TABLE servicenow_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    instance_url VARCHAR(255) NOT NULL,
    username_encrypted TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,

    -- Default ticket settings
    default_caller_id VARCHAR(100),
    default_assignment_group VARCHAR(100),
    default_category VARCHAR(100),

    enabled BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SMTP/Email Configuration
-- ============================================
CREATE TABLE smtp_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER DEFAULT 587,
    use_tls BOOLEAN DEFAULT TRUE,
    use_ssl BOOLEAN DEFAULT FALSE,
    username_encrypted TEXT,
    password_encrypted TEXT,
    from_address VARCHAR(255) NOT NULL,
    from_name VARCHAR(100),

    enabled BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Alert Types (Mnemonics to process)
-- ============================================
CREATE TABLE alert_types (
    id SERIAL PRIMARY KEY,
    mnemonic VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,

    -- LLM settings
    use_llm BOOLEAN DEFAULT TRUE,
    llm_provider_id INTEGER REFERENCES llm_providers(id) ON DELETE SET NULL,
    llm_prompt TEXT NOT NULL DEFAULT 'You are helpful networking engineer. You will get an error message and need to provide brief a solution with troubleshooting steps for the engineer.',

    -- Notification settings
    create_servicenow_ticket BOOLEAN DEFAULT TRUE,
    send_email BOOLEAN DEFAULT FALSE,

    -- Priority/Severity
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    urgency VARCHAR(10) DEFAULT '2',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Alert Notifications (links alert types to channels)
-- ============================================
CREATE TABLE alert_notifications (
    id SERIAL PRIMARY KEY,
    alert_type_id INTEGER NOT NULL REFERENCES alert_types(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('servicenow', 'smtp')),

    -- ServiceNow config (if type = servicenow)
    servicenow_config_id INTEGER REFERENCES servicenow_configs(id) ON DELETE SET NULL,

    -- SMTP config (if type = smtp)
    smtp_config_id INTEGER REFERENCES smtp_configs(id) ON DELETE SET NULL,

    enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_notification_config CHECK (
        (notification_type = 'servicenow' AND servicenow_config_id IS NOT NULL) OR
        (notification_type = 'smtp' AND smtp_config_id IS NOT NULL)
    )
);

-- ============================================
-- Email Recipients (for SMTP notifications)
-- ============================================
CREATE TABLE email_recipients (
    id SERIAL PRIMARY KEY,
    alert_notification_id INTEGER NOT NULL REFERENCES alert_notifications(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(100),
    recipient_type VARCHAR(10) DEFAULT 'to' CHECK (recipient_type IN ('to', 'cc', 'bcc')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Webhook Logs (audit trail)
-- ============================================
CREATE TABLE webhook_logs (
    id SERIAL PRIMARY KEY,
    request_id UUID DEFAULT uuid_generate_v4(),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Request details
    source_ip VARCHAR(45),
    request_headers JSONB,
    request_body JSONB,

    -- Parsed data
    mnemonic VARCHAR(100),
    alert_type_id INTEGER REFERENCES alert_types(id) ON DELETE SET NULL,
    host VARCHAR(255),
    vendor VARCHAR(100),
    message_text TEXT,

    -- LLM response
    llm_provider_id INTEGER REFERENCES llm_providers(id) ON DELETE SET NULL,
    llm_provider_name VARCHAR(100),
    llm_response TEXT,
    llm_response_time_ms INTEGER,

    -- Notification results
    servicenow_ticket_number VARCHAR(50),
    servicenow_response JSONB,
    email_sent BOOLEAN DEFAULT FALSE,
    email_response JSONB,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed', 'ignored')),
    error_message TEXT,
    processing_time_ms INTEGER,

    completed_at TIMESTAMP
);

-- ============================================
-- Audit Log (for configuration changes)
-- ============================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    entity_name VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45)
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at);
CREATE INDEX idx_webhook_logs_mnemonic ON webhook_logs(mnemonic);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_request_id ON webhook_logs(request_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_alert_types_mnemonic ON alert_types(mnemonic);
CREATE INDEX idx_alert_types_enabled ON alert_types(enabled);
CREATE INDEX idx_alert_notifications_alert_type ON alert_notifications(alert_type_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_llm_providers_updated_at BEFORE UPDATE ON llm_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servicenow_configs_updated_at BEFORE UPDATE ON servicenow_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_smtp_configs_updated_at BEFORE UPDATE ON smtp_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_types_updated_at BEFORE UPDATE ON alert_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
