import logging
import json
import time
from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from ..database import get_db_session
from ..models.orm import AlertType, AlertNotification, LLMProvider, ServiceNowConfig, SMTPConfig, WebhookLog
from ..services.llm_service import llm_service
from ..services.servicenow_service import servicenow_service
from ..services.smtp_service import smtp_service

log = logging.getLogger(__name__)

webhook_bp = Blueprint("webhook", __name__)


@webhook_bp.route("/webhook", methods=["POST"])
def webhook_post():
    """Main webhook handler for Splunk alerts"""
    start_time = time.time()
    log.info("=" * 80)
    log.info("WEBHOOK POST ENDPOINT CALLED")

    db = get_db_session()
    webhook_log = None

    try:
        # Parse incoming payload
        data = request.get_json()
        if not data:
            log.error("No JSON data received")
            return jsonify({"error": "No JSON data"}), 400

        log.info(f"Webhook received data: {json.dumps(data, indent=2)[:1000]}")

        # Create webhook log entry
        webhook_log = WebhookLog(
            source_ip=request.remote_addr,
            request_headers=dict(request.headers),
            request_body=data,
            status="received"
        )
        db.add(webhook_log)
        db.commit()

        # Validate payload structure
        if "result" not in data:
            log.error(f"Missing 'result' key in webhook data. Keys found: {list(data.keys())}")
            webhook_log.status = "failed"
            webhook_log.error_message = "Invalid payload structure - missing 'result' key"
            db.commit()
            return jsonify({"error": "Invalid payload structure - missing 'result' key"}), 400

        result_data = data["result"]
        mnemonic = result_data.get("mnemonic")
        host = result_data.get("host", "Unknown")
        vendor = result_data.get("vendor", "Unknown")
        message_text = result_data.get("message_text", "")

        log.info(f"Processing alert - Mnemonic: {mnemonic}, Host: {host}")

        # Update webhook log with parsed data
        webhook_log.mnemonic = mnemonic
        webhook_log.host = host
        webhook_log.vendor = vendor
        webhook_log.message_text = message_text
        webhook_log.status = "processing"
        db.commit()

        # Look up alert type configuration
        alert_type = db.query(AlertType).filter(
            AlertType.mnemonic == mnemonic,
            AlertType.enabled == True
        ).first()

        if not alert_type:
            log.info(f"No enabled configuration for mnemonic: {mnemonic}")
            webhook_log.status = "ignored"
            webhook_log.error_message = f"No enabled configuration for mnemonic: {mnemonic}"
            webhook_log.processing_time_ms = int((time.time() - start_time) * 1000)
            webhook_log.completed_at = datetime.utcnow()
            db.commit()
            return jsonify({"response": "mnemonic_not_configured", "ticket_created": False}), 200

        webhook_log.alert_type_id = alert_type.id

        # Build context for LLM
        error_context = f"""Error Message: {message_text}
Host: {host}
Vendor: {vendor}
Mnemonic: {mnemonic}"""

        llm_response = None

        # Get LLM response if configured
        if alert_type.use_llm:
            llm_provider = alert_type.llm_provider
            if not llm_provider:
                # Try to get default provider
                llm_provider = db.query(LLMProvider).filter(
                    LLMProvider.enabled == True,
                    LLMProvider.is_default == True
                ).first()

            if llm_provider:
                try:
                    webhook_log.llm_provider_id = llm_provider.id
                    webhook_log.llm_provider_name = llm_provider.name

                    llm_response, llm_time = llm_service.ask(
                        llm_provider,
                        alert_type.llm_prompt,
                        error_context
                    )

                    webhook_log.llm_response = llm_response
                    webhook_log.llm_response_time_ms = llm_time
                    log.info(f"LLM response received in {llm_time}ms")
                except Exception as e:
                    log.error(f"LLM error: {e}", exc_info=True)
                    webhook_log.error_message = f"LLM error: {str(e)}"
            else:
                log.warning("No LLM provider configured")

        db.commit()

        # Get notifications for this alert type
        notifications = db.query(AlertNotification).filter(
            AlertNotification.alert_type_id == alert_type.id,
            AlertNotification.enabled == True
        ).all()

        notification_results = []

        for notification in notifications:
            if notification.notification_type == "servicenow":
                if notification.servicenow_config and notification.servicenow_config.enabled:
                    short_desc = f"{mnemonic} detected on {host}"
                    description = f"Alert Information:\n{error_context}"
                    if llm_response:
                        description += f"\n\nRecommended Solution:\n{llm_response}"

                    result = servicenow_service.create_ticket(
                        notification.servicenow_config,
                        short_desc,
                        description,
                        alert_type.urgency
                    )

                    notification_results.append({
                        "type": "servicenow",
                        "config": notification.servicenow_config.name,
                        "result": result
                    })

                    if result["success"]:
                        webhook_log.servicenow_ticket_number = result["ticket_number"]
                        webhook_log.servicenow_response = result["response"]
                else:
                    log.warning(f"ServiceNow config not found or disabled for notification {notification.id}")

            elif notification.notification_type == "smtp":
                if notification.smtp_config and notification.smtp_config.enabled:
                    # Get recipients
                    recipients = [
                        {
                            "email": r.email,
                            "recipient_name": r.recipient_name,
                            "recipient_type": r.recipient_type
                        }
                        for r in notification.email_recipients
                    ]

                    if recipients:
                        subject = f"[{alert_type.severity.upper()}] {mnemonic} Alert - {host}"
                        body = f"Alert Information:\n\n{error_context}"
                        if llm_response:
                            body += f"\n\nRecommended Solution:\n{llm_response}"

                        result = smtp_service.send_email(
                            notification.smtp_config,
                            recipients,
                            subject,
                            body
                        )

                        notification_results.append({
                            "type": "smtp",
                            "config": notification.smtp_config.name,
                            "result": result
                        })

                        if result["success"]:
                            webhook_log.email_sent = True
                            webhook_log.email_response = result["details"]
                    else:
                        log.warning(f"No recipients configured for SMTP notification {notification.id}")
                else:
                    log.warning(f"SMTP config not found or disabled for notification {notification.id}")

        # Finalize webhook log
        processing_time = int((time.time() - start_time) * 1000)
        webhook_log.processing_time_ms = processing_time
        webhook_log.completed_at = datetime.utcnow()
        webhook_log.status = "completed"
        db.commit()

        log.info(f"Webhook processed successfully in {processing_time}ms")
        log.info("=" * 80)

        return jsonify({
            "status": "processed",
            "mnemonic": mnemonic,
            "host": host,
            "ticket_created": bool(webhook_log.servicenow_ticket_number),
            "ticket_number": webhook_log.servicenow_ticket_number,
            "email_sent": webhook_log.email_sent,
            "notifications_count": len(notification_results),
            "processing_time_ms": processing_time
        }), 200

    except Exception as e:
        log.error(f"Webhook processing error: {e}", exc_info=True)

        if webhook_log:
            webhook_log.status = "failed"
            webhook_log.error_message = str(e)
            webhook_log.processing_time_ms = int((time.time() - start_time) * 1000)
            webhook_log.completed_at = datetime.utcnow()
            db.commit()

        return jsonify({"error": str(e)}), 500

    finally:
        db.close()


@webhook_bp.route("/webhook", methods=["GET"])
def webhook_get():
    """Info page for webhook endpoint"""
    log.info("Webhook GET endpoint accessed")
    return """
    <html>
    <head><title>Splunk Webhook Service</title></head>
    <body>
        <h1>Splunk Webhook to ServiceNow/Email Integration</h1>
        <p>POST to /webhook to send alerts from Splunk</p>
        <h2>Available Endpoints:</h2>
        <ul>
            <li><strong>POST /webhook</strong> - Main webhook handler for Splunk alerts</li>
            <li><strong>POST /webhook/echo</strong> - Debug echo endpoint</li>
            <li><strong>GET /health</strong> - Health check</li>
        </ul>
        <p>Configure alert types and notifications via the Admin UI.</p>
    </body>
    </html>
    """, 200


@webhook_bp.route("/webhook/echo", methods=["POST"])
def webhook_echo():
    """Debug endpoint that echoes back what it receives"""
    log.info("ECHO ENDPOINT CALLED")
    try:
        data = request.get_json()
        log.info(f"Echo received JSON: {json.dumps(data, indent=2)}")
        return jsonify({
            "echo": data,
            "received_at": datetime.utcnow().isoformat(),
            "headers": dict(request.headers),
            "remote_addr": request.remote_addr
        }), 200
    except Exception as e:
        log.error(f"Echo endpoint error: {e}")
        return jsonify({
            "error": str(e),
            "raw_data": request.get_data(as_text=True)
        }), 200
