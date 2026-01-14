from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ============================================
# User Schemas
# ============================================
class UserBase(BaseModel):
    username: str
    email: str  # Changed from EmailStr to allow localhost emails
    role: str = "viewer"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ============================================
# LLM Provider Schemas
# ============================================
class LLMProviderBase(BaseModel):
    name: str
    provider_type: str
    openai_model: Optional[str] = "gpt-4o-mini-2024-07-18"
    ollama_host: Optional[str] = None
    ollama_port: Optional[int] = 11434
    ollama_model: Optional[str] = "llama3.1"
    max_tokens: Optional[int] = 1000
    temperature: Optional[str] = "0.7"
    enabled: bool = True
    is_default: bool = False


class LLMProviderCreate(LLMProviderBase):
    api_key: Optional[str] = None  # Plain text, will be encrypted


class LLMProviderUpdate(BaseModel):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    api_key: Optional[str] = None
    openai_model: Optional[str] = None
    ollama_host: Optional[str] = None
    ollama_port: Optional[int] = None
    ollama_model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[str] = None
    enabled: Optional[bool] = None
    is_default: Optional[bool] = None


class LLMProviderResponse(LLMProviderBase):
    id: int
    has_api_key: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# ServiceNow Config Schemas
# ============================================
class ServiceNowConfigBase(BaseModel):
    name: str
    instance_url: str
    default_caller_id: Optional[str] = None
    default_assignment_group: Optional[str] = None
    default_category: Optional[str] = None
    enabled: bool = True
    is_default: bool = False


class ServiceNowConfigCreate(ServiceNowConfigBase):
    username: str
    password: str


class ServiceNowConfigUpdate(BaseModel):
    name: Optional[str] = None
    instance_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    default_caller_id: Optional[str] = None
    default_assignment_group: Optional[str] = None
    default_category: Optional[str] = None
    enabled: Optional[bool] = None
    is_default: Optional[bool] = None


class ServiceNowConfigResponse(ServiceNowConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# SMTP Config Schemas
# ============================================
class SMTPConfigBase(BaseModel):
    name: str
    smtp_host: str
    smtp_port: int = 587
    use_tls: bool = True
    use_ssl: bool = False
    from_address: str
    from_name: Optional[str] = None
    enabled: bool = True
    is_default: bool = False


class SMTPConfigCreate(SMTPConfigBase):
    username: Optional[str] = None
    password: Optional[str] = None


class SMTPConfigUpdate(BaseModel):
    name: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None
    username: Optional[str] = None
    password: Optional[str] = None
    from_address: Optional[str] = None
    from_name: Optional[str] = None
    enabled: Optional[bool] = None
    is_default: Optional[bool] = None


class SMTPConfigResponse(SMTPConfigBase):
    id: int
    has_credentials: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Alert Type Schemas
# ============================================
class AlertTypeBase(BaseModel):
    mnemonic: str
    display_name: str
    description: Optional[str] = None
    enabled: bool = True
    use_llm: bool = True
    llm_provider_id: Optional[int] = None
    llm_prompt: str
    create_servicenow_ticket: bool = True
    send_email: bool = False
    severity: str = "medium"
    urgency: str = "2"


class AlertTypeCreate(AlertTypeBase):
    pass


class AlertTypeUpdate(BaseModel):
    mnemonic: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    use_llm: Optional[bool] = None
    llm_provider_id: Optional[int] = None
    llm_prompt: Optional[str] = None
    create_servicenow_ticket: Optional[bool] = None
    send_email: Optional[bool] = None
    severity: Optional[str] = None
    urgency: Optional[str] = None


class AlertTypeResponse(AlertTypeBase):
    id: int
    llm_provider_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Alert Notification Schemas
# ============================================
class EmailRecipientBase(BaseModel):
    email: str
    recipient_name: Optional[str] = None
    recipient_type: str = "to"


class EmailRecipientCreate(EmailRecipientBase):
    pass


class EmailRecipientResponse(EmailRecipientBase):
    id: int

    class Config:
        from_attributes = True


class AlertNotificationBase(BaseModel):
    notification_type: str
    servicenow_config_id: Optional[int] = None
    smtp_config_id: Optional[int] = None
    enabled: bool = True


class AlertNotificationCreate(AlertNotificationBase):
    email_recipients: Optional[List[EmailRecipientCreate]] = None


class AlertNotificationResponse(AlertNotificationBase):
    id: int
    alert_type_id: int
    email_recipients: List[EmailRecipientResponse] = []
    servicenow_config_name: Optional[str] = None
    smtp_config_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# Webhook Log Schemas
# ============================================
class WebhookLogResponse(BaseModel):
    id: int
    request_id: str
    received_at: datetime
    source_ip: Optional[str]
    mnemonic: Optional[str]
    host: Optional[str]
    vendor: Optional[str]
    message_text: Optional[str]
    llm_provider_name: Optional[str]
    llm_response: Optional[str]
    llm_response_time_ms: Optional[int]
    servicenow_ticket_number: Optional[str]
    email_sent: bool
    status: str
    error_message: Optional[str]
    processing_time_ms: Optional[int]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class WebhookLogDetailResponse(WebhookLogResponse):
    request_headers: Optional[dict]
    request_body: Optional[dict]
    servicenow_response: Optional[dict]
    email_response: Optional[dict]


class WebhookLogStats(BaseModel):
    total_count: int
    received_count: int
    processing_count: int
    completed_count: int
    failed_count: int
    ignored_count: int
    by_mnemonic: dict
    by_status: dict


# ============================================
# Test Response Schemas
# ============================================
class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    details: Optional[dict] = None
