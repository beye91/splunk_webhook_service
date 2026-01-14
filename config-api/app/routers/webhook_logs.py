from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from ..database import get_db
from ..models import orm, schemas
from ..services.auth import get_current_user

router = APIRouter(prefix="/webhook-logs", tags=["Webhook Logs"])


@router.get("", response_model=List[schemas.WebhookLogResponse])
def list_webhook_logs(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    mnemonic: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    query = db.query(orm.WebhookLog)

    if status:
        query = query.filter(orm.WebhookLog.status == status)
    if mnemonic:
        query = query.filter(orm.WebhookLog.mnemonic == mnemonic)
    if start_date:
        query = query.filter(orm.WebhookLog.received_at >= start_date)
    if end_date:
        query = query.filter(orm.WebhookLog.received_at <= end_date)

    logs = query.order_by(desc(orm.WebhookLog.received_at)).offset(offset).limit(limit).all()

    return [
        schemas.WebhookLogResponse(
            id=log.id,
            request_id=str(log.request_id) if log.request_id else None,
            received_at=log.received_at,
            source_ip=log.source_ip,
            mnemonic=log.mnemonic,
            host=log.host,
            vendor=log.vendor,
            message_text=log.message_text,
            llm_provider_name=log.llm_provider_name,
            llm_response=log.llm_response,
            llm_response_time_ms=log.llm_response_time_ms,
            servicenow_ticket_number=log.servicenow_ticket_number,
            email_sent=log.email_sent or False,
            status=log.status,
            error_message=log.error_message,
            processing_time_ms=log.processing_time_ms,
            completed_at=log.completed_at
        )
        for log in logs
    ]


@router.get("/stats", response_model=schemas.WebhookLogStats)
def get_webhook_log_stats(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    start_date = datetime.utcnow() - timedelta(days=days)

    # Total counts
    total_count = db.query(func.count(orm.WebhookLog.id)).filter(
        orm.WebhookLog.received_at >= start_date
    ).scalar() or 0

    # Count by status
    status_counts = db.query(
        orm.WebhookLog.status,
        func.count(orm.WebhookLog.id)
    ).filter(
        orm.WebhookLog.received_at >= start_date
    ).group_by(orm.WebhookLog.status).all()

    by_status = {status: count for status, count in status_counts}

    # Count by mnemonic
    mnemonic_counts = db.query(
        orm.WebhookLog.mnemonic,
        func.count(orm.WebhookLog.id)
    ).filter(
        orm.WebhookLog.received_at >= start_date,
        orm.WebhookLog.mnemonic.isnot(None)
    ).group_by(orm.WebhookLog.mnemonic).all()

    by_mnemonic = {mnemonic: count for mnemonic, count in mnemonic_counts}

    return schemas.WebhookLogStats(
        total_count=total_count,
        received_count=by_status.get("received", 0),
        processing_count=by_status.get("processing", 0),
        completed_count=by_status.get("completed", 0),
        failed_count=by_status.get("failed", 0),
        ignored_count=by_status.get("ignored", 0),
        by_mnemonic=by_mnemonic,
        by_status=by_status
    )


@router.get("/{log_id}", response_model=schemas.WebhookLogDetailResponse)
def get_webhook_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    log = db.query(orm.WebhookLog).filter(orm.WebhookLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    return schemas.WebhookLogDetailResponse(
        id=log.id,
        request_id=str(log.request_id) if log.request_id else None,
        received_at=log.received_at,
        source_ip=log.source_ip,
        request_headers=log.request_headers,
        request_body=log.request_body,
        mnemonic=log.mnemonic,
        host=log.host,
        vendor=log.vendor,
        message_text=log.message_text,
        llm_provider_name=log.llm_provider_name,
        llm_response=log.llm_response,
        llm_response_time_ms=log.llm_response_time_ms,
        servicenow_ticket_number=log.servicenow_ticket_number,
        servicenow_response=log.servicenow_response,
        email_sent=log.email_sent or False,
        email_response=log.email_response,
        status=log.status,
        error_message=log.error_message,
        processing_time_ms=log.processing_time_ms,
        completed_at=log.completed_at
    )
