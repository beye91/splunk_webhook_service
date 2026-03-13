from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, DECIMAL
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class LLMProvider(Base):
    __tablename__ = "llm_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    provider_type = Column(String(50), nullable=False)
    api_key_encrypted = Column(Text)
    openai_model = Column(String(100), default="gpt-4o-mini-2024-07-18")
    openai_base_url = Column(String(500))  # For OpenAI-compatible APIs (vLLM, etc.)
    ollama_host = Column(String(255))
    ollama_port = Column(Integer, default=11434)
    ollama_model = Column(String(100), default="llama3.1")
    max_tokens = Column(Integer, default=1000)
    temperature = Column(String(10), default="0.7")
    enabled = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())


class ServiceNowConfig(Base):
    __tablename__ = "servicenow_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    instance_url = Column(String(255), nullable=False)
    username_encrypted = Column(Text, nullable=False)
    password_encrypted = Column(Text, nullable=False)
    default_caller_id = Column(String(100))
    default_assignment_group = Column(String(100))
    default_category = Column(String(100))
    enabled = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())


class SMTPConfig(Base):
    __tablename__ = "smtp_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    smtp_host = Column(String(255), nullable=False)
    smtp_port = Column(Integer, default=587)
    use_tls = Column(Boolean, default=True)
    use_ssl = Column(Boolean, default=False)
    username_encrypted = Column(Text)
    password_encrypted = Column(Text)
    from_address = Column(String(255), nullable=False)
    from_name = Column(String(100))
    enabled = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())


class AlertType(Base):
    __tablename__ = "alert_types"

    id = Column(Integer, primary_key=True, index=True)
    mnemonic = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    enabled = Column(Boolean, default=True)
    use_llm = Column(Boolean, default=True)
    llm_provider_id = Column(Integer, ForeignKey("llm_providers.id", ondelete="SET NULL"))
    llm_prompt = Column(Text, nullable=False)
    create_servicenow_ticket = Column(Boolean, default=True)
    send_email = Column(Boolean, default=False)
    severity = Column(String(20), default="medium")
    urgency = Column(String(10), default="2")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now())

    llm_provider = relationship("LLMProvider")
    notifications = relationship("AlertNotification", back_populates="alert_type")


class AlertNotification(Base):
    __tablename__ = "alert_notifications"

    id = Column(Integer, primary_key=True, index=True)
    alert_type_id = Column(Integer, ForeignKey("alert_types.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    servicenow_config_id = Column(Integer, ForeignKey("servicenow_configs.id", ondelete="SET NULL"))
    smtp_config_id = Column(Integer, ForeignKey("smtp_configs.id", ondelete="SET NULL"))
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    alert_type = relationship("AlertType", back_populates="notifications")
    servicenow_config = relationship("ServiceNowConfig")
    smtp_config = relationship("SMTPConfig")
    email_recipients = relationship("EmailRecipient", back_populates="notification")


class EmailRecipient(Base):
    __tablename__ = "email_recipients"

    id = Column(Integer, primary_key=True, index=True)
    alert_notification_id = Column(Integer, ForeignKey("alert_notifications.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    recipient_name = Column(String(100))
    recipient_type = Column(String(10), default="to")
    created_at = Column(DateTime, server_default=func.now())

    notification = relationship("AlertNotification", back_populates="email_recipients")


class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(UUID(as_uuid=True), default=uuid.uuid4)
    received_at = Column(DateTime, server_default=func.now())
    source_ip = Column(String(45))
    request_headers = Column(JSONB)
    request_body = Column(JSONB)
    mnemonic = Column(String(100))
    alert_type_id = Column(Integer, ForeignKey("alert_types.id", ondelete="SET NULL"))
    host = Column(String(255))
    vendor = Column(String(100))
    message_text = Column(Text)
    llm_provider_id = Column(Integer, ForeignKey("llm_providers.id", ondelete="SET NULL"))
    llm_provider_name = Column(String(100))
    llm_response = Column(Text)
    llm_response_time_ms = Column(Integer)
    servicenow_ticket_number = Column(String(50))
    servicenow_response = Column(JSONB)
    email_sent = Column(Boolean, default=False)
    email_response = Column(JSONB)
    status = Column(String(50), default="received")
    error_message = Column(Text)
    processing_time_ms = Column(Integer)
    completed_at = Column(DateTime)
