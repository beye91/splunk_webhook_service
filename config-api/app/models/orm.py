from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, ARRAY, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="viewer")
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class LLMProvider(Base):
    __tablename__ = "llm_providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    provider_type = Column(String(50), nullable=False)

    # OpenAI specific
    api_key_encrypted = Column(Text)
    openai_model = Column(String(100), default="gpt-4o-mini-2024-07-18")

    # Ollama specific
    ollama_host = Column(String(255))
    ollama_port = Column(Integer, default=11434)
    ollama_model = Column(String(100), default="llama3.1")

    # Common settings
    max_tokens = Column(Integer, default=1000)
    temperature = Column(String(10), default="0.7")
    enabled = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    alert_types = relationship("AlertType", back_populates="llm_provider")


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
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    notifications = relationship("AlertNotification", back_populates="servicenow_config")


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
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    notifications = relationship("AlertNotification", back_populates="smtp_config")


class AlertType(Base):
    __tablename__ = "alert_types"

    id = Column(Integer, primary_key=True, index=True)
    mnemonic = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    enabled = Column(Boolean, default=True)

    # LLM settings
    use_llm = Column(Boolean, default=True)
    llm_provider_id = Column(Integer, ForeignKey("llm_providers.id", ondelete="SET NULL"))
    llm_prompt = Column(Text, nullable=False)

    # Notification settings
    create_servicenow_ticket = Column(Boolean, default=True)
    send_email = Column(Boolean, default=False)

    # Priority/Severity
    severity = Column(String(20), default="medium")
    urgency = Column(String(10), default="2")

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    llm_provider = relationship("LLMProvider", back_populates="alert_types")
    notifications = relationship("AlertNotification", back_populates="alert_type", cascade="all, delete-orphan")


class AlertNotification(Base):
    __tablename__ = "alert_notifications"

    id = Column(Integer, primary_key=True, index=True)
    alert_type_id = Column(Integer, ForeignKey("alert_types.id", ondelete="CASCADE"), nullable=False)
    notification_type = Column(String(50), nullable=False)

    servicenow_config_id = Column(Integer, ForeignKey("servicenow_configs.id", ondelete="SET NULL"))
    smtp_config_id = Column(Integer, ForeignKey("smtp_configs.id", ondelete="SET NULL"))

    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    alert_type = relationship("AlertType", back_populates="notifications")
    servicenow_config = relationship("ServiceNowConfig", back_populates="notifications")
    smtp_config = relationship("SMTPConfig", back_populates="notifications")
    email_recipients = relationship("EmailRecipient", back_populates="notification", cascade="all, delete-orphan")


class EmailRecipient(Base):
    __tablename__ = "email_recipients"

    id = Column(Integer, primary_key=True, index=True)
    alert_notification_id = Column(Integer, ForeignKey("alert_notifications.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), nullable=False)
    recipient_name = Column(String(100))
    recipient_type = Column(String(10), default="to")

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
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


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    username = Column(String(100))
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer)
    entity_name = Column(String(255))
    old_values = Column(JSONB)
    new_values = Column(JSONB)
    ip_address = Column(String(45))
