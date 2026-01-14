export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface LLMProvider {
  id: number;
  name: string;
  provider_type: 'openai' | 'ollama';
  openai_model: string;
  ollama_host: string | null;
  ollama_port: number | null;
  ollama_model: string | null;
  max_tokens: number;
  temperature: string;
  enabled: boolean;
  is_default: boolean;
  has_api_key: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceNowConfig {
  id: number;
  name: string;
  instance_url: string;
  default_caller_id: string | null;
  default_assignment_group: string | null;
  default_category: string | null;
  enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SMTPConfig {
  id: number;
  name: string;
  smtp_host: string;
  smtp_port: number;
  use_tls: boolean;
  use_ssl: boolean;
  from_address: string;
  from_name: string | null;
  enabled: boolean;
  is_default: boolean;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertType {
  id: number;
  mnemonic: string;
  display_name: string;
  description: string | null;
  enabled: boolean;
  use_llm: boolean;
  llm_provider_id: number | null;
  llm_prompt: string;
  create_servicenow_ticket: boolean;
  send_email: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgency: string;
  llm_provider_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailRecipient {
  id: number;
  email: string;
  recipient_name: string | null;
  recipient_type: 'to' | 'cc' | 'bcc';
}

export interface AlertNotification {
  id: number;
  alert_type_id: number;
  notification_type: 'servicenow' | 'smtp';
  servicenow_config_id: number | null;
  smtp_config_id: number | null;
  enabled: boolean;
  email_recipients: EmailRecipient[];
  servicenow_config_name: string | null;
  smtp_config_name: string | null;
}

export interface WebhookLog {
  id: number;
  request_id: string;
  received_at: string;
  source_ip: string | null;
  mnemonic: string | null;
  host: string | null;
  vendor: string | null;
  message_text: string | null;
  llm_provider_name: string | null;
  llm_response: string | null;
  llm_response_time_ms: number | null;
  servicenow_ticket_number: string | null;
  email_sent: boolean;
  status: 'received' | 'processing' | 'completed' | 'failed' | 'ignored';
  error_message: string | null;
  processing_time_ms: number | null;
  completed_at: string | null;
}

export interface WebhookLogStats {
  total_count: number;
  received_count: number;
  processing_count: number;
  completed_count: number;
  failed_count: number;
  ignored_count: number;
  by_mnemonic: Record<string, number>;
  by_status: Record<string, number>;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}
