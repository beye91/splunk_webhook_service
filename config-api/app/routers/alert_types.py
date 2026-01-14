from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import orm, schemas
from ..services.auth import get_current_user

router = APIRouter(prefix="/alert-types", tags=["Alert Types"])


@router.get("", response_model=List[schemas.AlertTypeResponse])
def list_alert_types(db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    alert_types = db.query(orm.AlertType).all()
    result = []
    for at in alert_types:
        response = schemas.AlertTypeResponse(
            id=at.id,
            mnemonic=at.mnemonic,
            display_name=at.display_name,
            description=at.description,
            enabled=at.enabled,
            use_llm=at.use_llm,
            llm_provider_id=at.llm_provider_id,
            llm_prompt=at.llm_prompt,
            create_servicenow_ticket=at.create_servicenow_ticket,
            send_email=at.send_email,
            severity=at.severity,
            urgency=at.urgency,
            llm_provider_name=at.llm_provider.name if at.llm_provider else None,
            created_at=at.created_at,
            updated_at=at.updated_at
        )
        result.append(response)
    return result


@router.get("/mnemonic/{mnemonic}", response_model=schemas.AlertTypeResponse)
def get_alert_type_by_mnemonic(mnemonic: str, db: Session = Depends(get_db)):
    """Get alert type by mnemonic - no auth required for webhook service"""
    alert_type = db.query(orm.AlertType).filter(orm.AlertType.mnemonic == mnemonic).first()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert type not found")

    return schemas.AlertTypeResponse(
        id=alert_type.id,
        mnemonic=alert_type.mnemonic,
        display_name=alert_type.display_name,
        description=alert_type.description,
        enabled=alert_type.enabled,
        use_llm=alert_type.use_llm,
        llm_provider_id=alert_type.llm_provider_id,
        llm_prompt=alert_type.llm_prompt,
        create_servicenow_ticket=alert_type.create_servicenow_ticket,
        send_email=alert_type.send_email,
        severity=alert_type.severity,
        urgency=alert_type.urgency,
        llm_provider_name=alert_type.llm_provider.name if alert_type.llm_provider else None,
        created_at=alert_type.created_at,
        updated_at=alert_type.updated_at
    )


@router.get("/{alert_type_id}", response_model=schemas.AlertTypeResponse)
def get_alert_type(alert_type_id: int, db: Session = Depends(get_db), current_user: orm.User = Depends(get_current_user)):
    alert_type = db.query(orm.AlertType).filter(orm.AlertType.id == alert_type_id).first()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert type not found")

    return schemas.AlertTypeResponse(
        id=alert_type.id,
        mnemonic=alert_type.mnemonic,
        display_name=alert_type.display_name,
        description=alert_type.description,
        enabled=alert_type.enabled,
        use_llm=alert_type.use_llm,
        llm_provider_id=alert_type.llm_provider_id,
        llm_prompt=alert_type.llm_prompt,
        create_servicenow_ticket=alert_type.create_servicenow_ticket,
        send_email=alert_type.send_email,
        severity=alert_type.severity,
        urgency=alert_type.urgency,
        llm_provider_name=alert_type.llm_provider.name if alert_type.llm_provider else None,
        created_at=alert_type.created_at,
        updated_at=alert_type.updated_at
    )


@router.post("", response_model=schemas.AlertTypeResponse, status_code=status.HTTP_201_CREATED)
def create_alert_type(
    alert_data: schemas.AlertTypeCreate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    existing = db.query(orm.AlertType).filter(orm.AlertType.mnemonic == alert_data.mnemonic).first()
    if existing:
        raise HTTPException(status_code=400, detail="Alert type with this mnemonic already exists")

    if alert_data.llm_provider_id:
        provider = db.query(orm.LLMProvider).filter(orm.LLMProvider.id == alert_data.llm_provider_id).first()
        if not provider:
            raise HTTPException(status_code=400, detail="LLM provider not found")

    alert_type = orm.AlertType(
        mnemonic=alert_data.mnemonic,
        display_name=alert_data.display_name,
        description=alert_data.description,
        enabled=alert_data.enabled,
        use_llm=alert_data.use_llm,
        llm_provider_id=alert_data.llm_provider_id,
        llm_prompt=alert_data.llm_prompt,
        create_servicenow_ticket=alert_data.create_servicenow_ticket,
        send_email=alert_data.send_email,
        severity=alert_data.severity,
        urgency=alert_data.urgency
    )

    db.add(alert_type)
    db.commit()
    db.refresh(alert_type)

    return schemas.AlertTypeResponse(
        id=alert_type.id,
        mnemonic=alert_type.mnemonic,
        display_name=alert_type.display_name,
        description=alert_type.description,
        enabled=alert_type.enabled,
        use_llm=alert_type.use_llm,
        llm_provider_id=alert_type.llm_provider_id,
        llm_prompt=alert_type.llm_prompt,
        create_servicenow_ticket=alert_type.create_servicenow_ticket,
        send_email=alert_type.send_email,
        severity=alert_type.severity,
        urgency=alert_type.urgency,
        llm_provider_name=alert_type.llm_provider.name if alert_type.llm_provider else None,
        created_at=alert_type.created_at,
        updated_at=alert_type.updated_at
    )


@router.put("/{alert_type_id}", response_model=schemas.AlertTypeResponse)
def update_alert_type(
    alert_type_id: int,
    alert_data: schemas.AlertTypeUpdate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    alert_type = db.query(orm.AlertType).filter(orm.AlertType.id == alert_type_id).first()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert type not found")

    update_data = alert_data.model_dump(exclude_unset=True)

    if "mnemonic" in update_data:
        existing = db.query(orm.AlertType).filter(
            orm.AlertType.mnemonic == update_data["mnemonic"],
            orm.AlertType.id != alert_type_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Alert type with this mnemonic already exists")

    if "llm_provider_id" in update_data and update_data["llm_provider_id"]:
        provider = db.query(orm.LLMProvider).filter(orm.LLMProvider.id == update_data["llm_provider_id"]).first()
        if not provider:
            raise HTTPException(status_code=400, detail="LLM provider not found")

    for key, value in update_data.items():
        setattr(alert_type, key, value)

    db.commit()
    db.refresh(alert_type)

    return schemas.AlertTypeResponse(
        id=alert_type.id,
        mnemonic=alert_type.mnemonic,
        display_name=alert_type.display_name,
        description=alert_type.description,
        enabled=alert_type.enabled,
        use_llm=alert_type.use_llm,
        llm_provider_id=alert_type.llm_provider_id,
        llm_prompt=alert_type.llm_prompt,
        create_servicenow_ticket=alert_type.create_servicenow_ticket,
        send_email=alert_type.send_email,
        severity=alert_type.severity,
        urgency=alert_type.urgency,
        llm_provider_name=alert_type.llm_provider.name if alert_type.llm_provider else None,
        created_at=alert_type.created_at,
        updated_at=alert_type.updated_at
    )


@router.delete("/{alert_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert_type(
    alert_type_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    alert_type = db.query(orm.AlertType).filter(orm.AlertType.id == alert_type_id).first()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert type not found")

    db.delete(alert_type)
    db.commit()
    return None


@router.post("/{alert_type_id}/toggle", response_model=schemas.AlertTypeResponse)
def toggle_alert_type(
    alert_type_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    alert_type = db.query(orm.AlertType).filter(orm.AlertType.id == alert_type_id).first()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert type not found")

    alert_type.enabled = not alert_type.enabled
    db.commit()
    db.refresh(alert_type)

    return schemas.AlertTypeResponse(
        id=alert_type.id,
        mnemonic=alert_type.mnemonic,
        display_name=alert_type.display_name,
        description=alert_type.description,
        enabled=alert_type.enabled,
        use_llm=alert_type.use_llm,
        llm_provider_id=alert_type.llm_provider_id,
        llm_prompt=alert_type.llm_prompt,
        create_servicenow_ticket=alert_type.create_servicenow_ticket,
        send_email=alert_type.send_email,
        severity=alert_type.severity,
        urgency=alert_type.urgency,
        llm_provider_name=alert_type.llm_provider.name if alert_type.llm_provider else None,
        created_at=alert_type.created_at,
        updated_at=alert_type.updated_at
    )


# ============================================
# Alert Notifications Endpoints
# ============================================
@router.get("/{alert_type_id}/notifications", response_model=List[schemas.AlertNotificationResponse])
def list_alert_notifications(
    alert_type_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    alert_type = db.query(orm.AlertType).filter(orm.AlertType.id == alert_type_id).first()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert type not found")

    notifications = db.query(orm.AlertNotification).filter(
        orm.AlertNotification.alert_type_id == alert_type_id
    ).all()

    result = []
    for n in notifications:
        recipients = [
            schemas.EmailRecipientResponse(
                id=r.id,
                email=r.email,
                recipient_name=r.recipient_name,
                recipient_type=r.recipient_type
            ) for r in n.email_recipients
        ]

        response = schemas.AlertNotificationResponse(
            id=n.id,
            alert_type_id=n.alert_type_id,
            notification_type=n.notification_type,
            servicenow_config_id=n.servicenow_config_id,
            smtp_config_id=n.smtp_config_id,
            enabled=n.enabled,
            email_recipients=recipients,
            servicenow_config_name=n.servicenow_config.name if n.servicenow_config else None,
            smtp_config_name=n.smtp_config.name if n.smtp_config else None
        )
        result.append(response)

    return result


@router.post("/{alert_type_id}/notifications", response_model=schemas.AlertNotificationResponse, status_code=status.HTTP_201_CREATED)
def create_alert_notification(
    alert_type_id: int,
    notification_data: schemas.AlertNotificationCreate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    alert_type = db.query(orm.AlertType).filter(orm.AlertType.id == alert_type_id).first()
    if not alert_type:
        raise HTTPException(status_code=404, detail="Alert type not found")

    if notification_data.notification_type == "servicenow":
        if not notification_data.servicenow_config_id:
            raise HTTPException(status_code=400, detail="ServiceNow config ID required")
        config = db.query(orm.ServiceNowConfig).filter(orm.ServiceNowConfig.id == notification_data.servicenow_config_id).first()
        if not config:
            raise HTTPException(status_code=400, detail="ServiceNow config not found")
    elif notification_data.notification_type == "smtp":
        if not notification_data.smtp_config_id:
            raise HTTPException(status_code=400, detail="SMTP config ID required")
        config = db.query(orm.SMTPConfig).filter(orm.SMTPConfig.id == notification_data.smtp_config_id).first()
        if not config:
            raise HTTPException(status_code=400, detail="SMTP config not found")
    else:
        raise HTTPException(status_code=400, detail="Invalid notification type")

    notification = orm.AlertNotification(
        alert_type_id=alert_type_id,
        notification_type=notification_data.notification_type,
        servicenow_config_id=notification_data.servicenow_config_id,
        smtp_config_id=notification_data.smtp_config_id,
        enabled=notification_data.enabled
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Add email recipients if provided
    if notification_data.email_recipients:
        for recipient_data in notification_data.email_recipients:
            recipient = orm.EmailRecipient(
                alert_notification_id=notification.id,
                email=recipient_data.email,
                recipient_name=recipient_data.recipient_name,
                recipient_type=recipient_data.recipient_type
            )
            db.add(recipient)
        db.commit()
        db.refresh(notification)

    recipients = [
        schemas.EmailRecipientResponse(
            id=r.id,
            email=r.email,
            recipient_name=r.recipient_name,
            recipient_type=r.recipient_type
        ) for r in notification.email_recipients
    ]

    return schemas.AlertNotificationResponse(
        id=notification.id,
        alert_type_id=notification.alert_type_id,
        notification_type=notification.notification_type,
        servicenow_config_id=notification.servicenow_config_id,
        smtp_config_id=notification.smtp_config_id,
        enabled=notification.enabled,
        email_recipients=recipients,
        servicenow_config_name=notification.servicenow_config.name if notification.servicenow_config else None,
        smtp_config_name=notification.smtp_config.name if notification.smtp_config else None
    )


@router.delete("/{alert_type_id}/notifications/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert_notification(
    alert_type_id: int,
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    notification = db.query(orm.AlertNotification).filter(
        orm.AlertNotification.id == notification_id,
        orm.AlertNotification.alert_type_id == alert_type_id
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()
    return None
