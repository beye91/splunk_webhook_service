from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import smtplib
import ssl
from email.mime.text import MIMEText
from ..database import get_db
from ..models import orm, schemas
from ..services.auth import get_current_user
from ..services.encryption import get_encryption_service

router = APIRouter(prefix="/smtp-configs", tags=["SMTP Configs"])


@router.get("", response_model=List[schemas.SMTPConfigResponse])
def list_smtp_configs(db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    configs = db.query(orm.SMTPConfig).all()
    result = []
    for config in configs:
        response = schemas.SMTPConfigResponse(
            id=config.id,
            name=config.name,
            smtp_host=config.smtp_host,
            smtp_port=config.smtp_port,
            use_tls=config.use_tls,
            use_ssl=config.use_ssl,
            from_address=config.from_address,
            from_name=config.from_name,
            enabled=config.enabled,
            is_default=config.is_default,
            has_credentials=bool(config.username_encrypted),
            created_at=config.created_at,
            updated_at=config.updated_at
        )
        result.append(response)
    return result


@router.get("/{config_id}", response_model=schemas.SMTPConfigResponse)
def get_smtp_config(config_id: int, db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    config = db.query(orm.SMTPConfig).filter(orm.SMTPConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="SMTP config not found")

    return schemas.SMTPConfigResponse(
        id=config.id,
        name=config.name,
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        use_tls=config.use_tls,
        use_ssl=config.use_ssl,
        from_address=config.from_address,
        from_name=config.from_name,
        enabled=config.enabled,
        is_default=config.is_default,
        has_credentials=bool(config.username_encrypted),
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("", response_model=schemas.SMTPConfigResponse, status_code=status.HTTP_201_CREATED)
def create_smtp_config(
    config_data: schemas.SMTPConfigCreate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    existing = db.query(orm.SMTPConfig).filter(orm.SMTPConfig.name == config_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Config with this name already exists")

    config = orm.SMTPConfig(
        name=config_data.name,
        smtp_host=config_data.smtp_host,
        smtp_port=config_data.smtp_port,
        use_tls=config_data.use_tls,
        use_ssl=config_data.use_ssl,
        username_encrypted=encryption.encrypt(config_data.username) if config_data.username else None,
        password_encrypted=encryption.encrypt(config_data.password) if config_data.password else None,
        from_address=config_data.from_address,
        from_name=config_data.from_name,
        enabled=config_data.enabled,
        is_default=config_data.is_default
    )

    if config_data.is_default:
        db.query(orm.SMTPConfig).filter(orm.SMTPConfig.is_default == True).update({"is_default": False})

    db.add(config)
    db.commit()
    db.refresh(config)

    return schemas.SMTPConfigResponse(
        id=config.id,
        name=config.name,
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        use_tls=config.use_tls,
        use_ssl=config.use_ssl,
        from_address=config.from_address,
        from_name=config.from_name,
        enabled=config.enabled,
        is_default=config.is_default,
        has_credentials=bool(config.username_encrypted),
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/{config_id}", response_model=schemas.SMTPConfigResponse)
def update_smtp_config(
    config_id: int,
    config_data: schemas.SMTPConfigUpdate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    config = db.query(orm.SMTPConfig).filter(orm.SMTPConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="SMTP config not found")

    update_data = config_data.model_dump(exclude_unset=True)

    if "username" in update_data:
        username = update_data.pop("username")
        config.username_encrypted = encryption.encrypt(username) if username else None
    if "password" in update_data:
        password = update_data.pop("password")
        config.password_encrypted = encryption.encrypt(password) if password else None

    if "is_default" in update_data and update_data["is_default"]:
        db.query(orm.SMTPConfig).filter(orm.SMTPConfig.id != config_id).update({"is_default": False})

    for key, value in update_data.items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)

    return schemas.SMTPConfigResponse(
        id=config.id,
        name=config.name,
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        use_tls=config.use_tls,
        use_ssl=config.use_ssl,
        from_address=config.from_address,
        from_name=config.from_name,
        enabled=config.enabled,
        is_default=config.is_default,
        has_credentials=bool(config.username_encrypted),
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_smtp_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    config = db.query(orm.SMTPConfig).filter(orm.SMTPConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="SMTP config not found")

    db.delete(config)
    db.commit()
    return None


@router.post("/{config_id}/test", response_model=schemas.TestConnectionResponse)
def test_smtp_config(
    config_id: int,
    test_email: str = None,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    config = db.query(orm.SMTPConfig).filter(orm.SMTPConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="SMTP config not found")

    try:
        if config.use_ssl:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, context=context, timeout=15)
        else:
            server = smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=15)
            if config.use_tls:
                server.starttls()

        if config.username_encrypted and config.password_encrypted:
            username = encryption.decrypt(config.username_encrypted)
            password = encryption.decrypt(config.password_encrypted)
            server.login(username, password)

        # Send test email if address provided
        if test_email:
            msg = MIMEText("This is a test email from Splunk Webhook Admin Platform.")
            msg["Subject"] = "SMTP Test - Splunk Webhook Admin"
            msg["From"] = f"{config.from_name} <{config.from_address}>" if config.from_name else config.from_address
            msg["To"] = test_email

            server.sendmail(config.from_address, [test_email], msg.as_string())
            server.quit()

            return schemas.TestConnectionResponse(
                success=True,
                message=f"Successfully connected and sent test email to {test_email}",
                details={"host": config.smtp_host, "port": config.smtp_port}
            )
        else:
            server.quit()
            return schemas.TestConnectionResponse(
                success=True,
                message="Successfully connected to SMTP server",
                details={"host": config.smtp_host, "port": config.smtp_port}
            )

    except smtplib.SMTPAuthenticationError:
        return schemas.TestConnectionResponse(
            success=False,
            message="Authentication failed - invalid credentials"
        )
    except smtplib.SMTPConnectError as e:
        return schemas.TestConnectionResponse(
            success=False,
            message=f"Connection failed: {str(e)}"
        )
    except TimeoutError:
        return schemas.TestConnectionResponse(
            success=False,
            message="Connection timeout"
        )
    except Exception as e:
        return schemas.TestConnectionResponse(
            success=False,
            message=f"Error: {str(e)}"
        )
