import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List
from ..utils.encryption import encryption_service

log = logging.getLogger(__name__)


class SMTPService:
    def __init__(self):
        pass

    def send_email(
        self,
        config,
        recipients: List[dict],
        subject: str,
        body: str,
        html_body: str = None
    ) -> dict:
        """
        Send an email using the SMTP configuration

        Args:
            config: SMTPConfig ORM object
            recipients: List of dicts with keys: email, recipient_name, recipient_type (to/cc/bcc)
            subject: Email subject
            body: Plain text body
            html_body: Optional HTML body

        Returns:
            dict with keys: success, message, details
        """
        try:
            log.info(f"Sending email via {config.smtp_host}:{config.smtp_port}")

            # Create message
            if html_body:
                msg = MIMEMultipart("alternative")
                msg.attach(MIMEText(body, "plain"))
                msg.attach(MIMEText(html_body, "html"))
            else:
                msg = MIMEText(body, "plain")

            msg["Subject"] = subject

            if config.from_name:
                msg["From"] = f"{config.from_name} <{config.from_address}>"
            else:
                msg["From"] = config.from_address

            # Sort recipients by type
            to_addrs = [r["email"] for r in recipients if r.get("recipient_type", "to") == "to"]
            cc_addrs = [r["email"] for r in recipients if r.get("recipient_type") == "cc"]
            bcc_addrs = [r["email"] for r in recipients if r.get("recipient_type") == "bcc"]

            if to_addrs:
                msg["To"] = ", ".join(to_addrs)
            if cc_addrs:
                msg["Cc"] = ", ".join(cc_addrs)

            all_recipients = to_addrs + cc_addrs + bcc_addrs

            if not all_recipients:
                return {
                    "success": False,
                    "message": "No recipients specified",
                    "details": None
                }

            log.debug(f"Recipients: To={to_addrs}, Cc={cc_addrs}, Bcc={bcc_addrs}")

            # Connect to SMTP server
            if config.use_ssl:
                context = ssl.create_default_context()
                server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, context=context, timeout=30)
            else:
                server = smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=30)
                if config.use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)

            # Authenticate if credentials provided
            if config.username_encrypted and config.password_encrypted:
                username = encryption_service.decrypt(config.username_encrypted)
                password = encryption_service.decrypt(config.password_encrypted)
                server.login(username, password)

            # Send email
            server.sendmail(config.from_address, all_recipients, msg.as_string())
            server.quit()

            log.info(f"Email sent successfully to {len(all_recipients)} recipients")
            return {
                "success": True,
                "message": f"Email sent to {len(all_recipients)} recipients",
                "details": {
                    "recipients_count": len(all_recipients),
                    "to": to_addrs,
                    "cc": cc_addrs,
                    "bcc_count": len(bcc_addrs)
                }
            }

        except smtplib.SMTPAuthenticationError as e:
            error_msg = "SMTP authentication failed"
            log.error(f"{error_msg}: {e}")
            return {
                "success": False,
                "message": error_msg,
                "details": {"error": str(e)}
            }
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error: {str(e)}"
            log.error(error_msg)
            return {
                "success": False,
                "message": error_msg,
                "details": {"error": str(e)}
            }
        except Exception as e:
            error_msg = f"Error sending email: {str(e)}"
            log.error(error_msg, exc_info=True)
            return {
                "success": False,
                "message": error_msg,
                "details": {"error": str(e)}
            }


smtp_service = SMTPService()
