from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from ..database import get_db
from ..models import orm, schemas
from ..services.auth import get_current_user
from ..config import get_settings

router = APIRouter(prefix="/webhook", tags=["Webhook Test"])


@router.post("/test", response_model=schemas.WebhookTestResponse)
async def test_webhook(
    test_data: schemas.WebhookTestRequest,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
):
    """
    Send a test webhook request to trigger the full processing pipeline.
    Creates ServiceNow ticket and/or sends email based on alert type configuration.
    """
    settings = get_settings()

    # Validate that the mnemonic exists and is enabled
    alert_type = db.query(orm.AlertType).filter(
        orm.AlertType.mnemonic == test_data.mnemonic
    ).first()

    if not alert_type:
        raise HTTPException(
            status_code=400,
            detail=f"Alert type with mnemonic '{test_data.mnemonic}' not found"
        )

    if not alert_type.enabled:
        raise HTTPException(
            status_code=400,
            detail=f"Alert type '{test_data.mnemonic}' is disabled"
        )

    # Build webhook payload
    webhook_payload = {
        "result": {
            "mnemonic": test_data.mnemonic,
            "host": test_data.host,
            "vendor": test_data.vendor,
            "message_text": test_data.message_text
        },
        "_test": True,
        "_test_user": current_user.username
    }

    # Forward to webhook service
    webhook_url = f"{settings.webhook_service_url}/webhook"

    try:
        # Use transport to bypass proxy for internal Docker network
        transport = httpx.AsyncHTTPTransport()
        async with httpx.AsyncClient(transport=transport, timeout=60.0) as client:
            response = await client.post(
                webhook_url,
                json=webhook_payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Test-Request": "true",
                    "X-Test-User": current_user.username
                }
            )

            if response.status_code == 200:
                result = response.json()
                return schemas.WebhookTestResponse(
                    success=True,
                    message="Test webhook processed successfully",
                    details={
                        "mnemonic": test_data.mnemonic,
                        "host": test_data.host,
                        "ticket_created": bool(result.get("ticket_number")),
                        "ticket_number": result.get("ticket_number"),
                        "email_sent": result.get("email_sent", False),
                        "processing_time_ms": result.get("processing_time_ms"),
                        "log_id": result.get("log_id")
                    }
                )
            else:
                try:
                    error_detail = response.json()
                except Exception:
                    error_detail = response.text
                return schemas.WebhookTestResponse(
                    success=False,
                    message=f"Webhook service returned status {response.status_code}",
                    details={"error": error_detail}
                )

    except httpx.TimeoutException:
        return schemas.WebhookTestResponse(
            success=False,
            message="Webhook processing timed out (>60s)"
        )
    except httpx.ConnectError as e:
        return schemas.WebhookTestResponse(
            success=False,
            message=f"Failed to connect to webhook service: {str(e)}"
        )
    except Exception as e:
        return schemas.WebhookTestResponse(
            success=False,
            message=f"Error: {str(e)}"
        )
