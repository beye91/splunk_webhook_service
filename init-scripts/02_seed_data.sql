-- Splunk Webhook Admin Platform - Seed Data
-- Initial data for a working setup

-- ============================================
-- Default Admin User
-- Password: Admin123! (bcrypt hash)
-- ============================================
INSERT INTO users (username, email, password_hash, role, is_active) VALUES
('admin', 'admin@localhost', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.QoQqmFmn7e3o7e', 'admin', true);

-- ============================================
-- Default LLM Provider (OpenAI - API key needs to be set via UI)
-- ============================================
INSERT INTO llm_providers (name, provider_type, openai_model, enabled, is_default) VALUES
('OpenAI GPT-4o Mini', 'openai', 'gpt-4o-mini-2024-07-18', false, false);

-- ============================================
-- Example Ollama Provider (disabled by default)
-- ============================================
INSERT INTO llm_providers (name, provider_type, ollama_host, ollama_port, ollama_model, enabled, is_default) VALUES
('Local Ollama', 'ollama', 'localhost', 11434, 'llama3.1', false, false);

-- ============================================
-- Default Alert Type (DUP_SRC_IP from original implementation)
-- ============================================
INSERT INTO alert_types (
    mnemonic,
    display_name,
    description,
    enabled,
    use_llm,
    llm_prompt,
    create_servicenow_ticket,
    send_email,
    severity,
    urgency
) VALUES (
    'DUP_SRC_IP',
    'Duplicate Source IP',
    'Duplicate source IP address detected on network device. This typically indicates an IP conflict that needs immediate resolution.',
    true,
    true,
    'You are helpful networking engineer. You will get an error message about a duplicate source IP issue and need to provide brief a solution with troubleshooting steps for the engineer. Focus on identifying the conflicting devices and resolving the IP conflict.',
    true,
    false,
    'high',
    '2'
);

-- ============================================
-- Example Alert Types (disabled by default)
-- ============================================
INSERT INTO alert_types (
    mnemonic,
    display_name,
    description,
    enabled,
    use_llm,
    llm_prompt,
    create_servicenow_ticket,
    send_email,
    severity,
    urgency
) VALUES
(
    'LINK_DOWN',
    'Interface Link Down',
    'Network interface has gone down. May indicate physical connectivity issues or hardware failure.',
    false,
    true,
    'You are helpful networking engineer. Analyze this link down event and provide troubleshooting steps. Consider physical layer issues, cable problems, port errors, and configuration issues.',
    true,
    false,
    'high',
    '1'
),
(
    'BGP_PEER_DOWN',
    'BGP Peer Session Down',
    'BGP peering session has terminated. This may affect network routing and connectivity.',
    false,
    true,
    'You are helpful networking engineer. A BGP peer session has gone down. Provide troubleshooting steps covering: peer reachability, BGP configuration, route policies, and session parameters.',
    true,
    true,
    'critical',
    '1'
),
(
    'HIGH_CPU',
    'High CPU Utilization',
    'Device CPU utilization has exceeded threshold. May indicate resource exhaustion or attack.',
    false,
    true,
    'You are helpful networking engineer. The device is experiencing high CPU utilization. Provide steps to identify the cause including: process analysis, traffic patterns, potential DoS, and resource optimization.',
    true,
    false,
    'medium',
    '2'
),
(
    'CONFIG_CHANGE',
    'Configuration Change Detected',
    'Device configuration has been modified. Review for unauthorized or erroneous changes.',
    false,
    false,
    'You are helpful networking engineer. A configuration change was detected. Summarize the implications and provide guidance on validating the change.',
    false,
    true,
    'low',
    '3'
);
