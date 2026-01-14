import logging
import json
import requests
from requests.auth import HTTPBasicAuth
from ..utils.encryption import encryption_service

log = logging.getLogger(__name__)


class ServiceNowService:
    def __init__(self):
        pass

    def get_user_sys_id(self, config, username: str) -> str:
        """Get the sys_id of a user by username"""
        try:
            instance_url = config.instance_url.rstrip("/")
            if not instance_url.startswith("http"):
                instance_url = f"https://{instance_url}"

            decrypted_username = encryption_service.decrypt(config.username_encrypted)
            decrypted_password = encryption_service.decrypt(config.password_encrypted)

            url = f"{instance_url}/api/now/table/sys_user"
            params = {"user_name": username or decrypted_username}
            headers = {"Accept": "application/json"}

            log.debug(f"Getting sys_id for user: {params['user_name']}")

            response = requests.get(
                url,
                auth=HTTPBasicAuth(decrypted_username, decrypted_password),
                headers=headers,
                params=params,
                timeout=15
            )

            if response.status_code == 200:
                result = response.json()
                if "result" in result and len(result["result"]) > 0:
                    sys_id = result["result"][0]["sys_id"]
                    log.info(f"Found sys_id: {sys_id}")
                    return sys_id

            log.warning(f"Could not find sys_id for user: {params['user_name']}")
            return None

        except Exception as e:
            log.error(f"Error getting sys_id: {e}", exc_info=True)
            return None

    def create_ticket(self, config, short_description: str, description: str, urgency: str = "2", caller_sys_id: str = None) -> dict:
        """
        Create a ServiceNow incident ticket

        Returns:
            dict with keys: success, ticket_number, message, response
        """
        try:
            instance_url = config.instance_url.rstrip("/")
            if not instance_url.startswith("http"):
                instance_url = f"https://{instance_url}"

            decrypted_username = encryption_service.decrypt(config.username_encrypted)
            decrypted_password = encryption_service.decrypt(config.password_encrypted)

            url = f"{instance_url}/api/now/table/incident"
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }

            # Get caller sys_id if not provided
            if not caller_sys_id:
                caller_sys_id = self.get_user_sys_id(config, decrypted_username)

            payload = {
                "short_description": short_description,
                "description": description,
                "urgency": urgency
            }

            if caller_sys_id:
                payload["caller_id"] = caller_sys_id

            if config.default_assignment_group:
                payload["assignment_group"] = config.default_assignment_group

            if config.default_category:
                payload["category"] = config.default_category

            log.info(f"Creating ServiceNow ticket at {instance_url}")
            log.debug(f"Payload: {json.dumps(payload, indent=2)}")

            response = requests.post(
                url,
                auth=HTTPBasicAuth(decrypted_username, decrypted_password),
                headers=headers,
                data=json.dumps(payload),
                timeout=30
            )

            if response.status_code == 201:
                ticket_data = response.json()
                ticket_number = ticket_data.get("result", {}).get("number", "Unknown")
                log.info(f"ServiceNow ticket created successfully: {ticket_number}")
                return {
                    "success": True,
                    "ticket_number": ticket_number,
                    "message": f"Incident created successfully: {ticket_number}",
                    "response": ticket_data
                }
            else:
                error_msg = f"Failed to create ticket: Status {response.status_code}"
                log.error(f"{error_msg} - {response.text}")
                return {
                    "success": False,
                    "ticket_number": None,
                    "message": error_msg,
                    "response": {"status_code": response.status_code, "body": response.text[:500]}
                }

        except Exception as e:
            error_msg = f"Error creating ServiceNow ticket: {str(e)}"
            log.error(error_msg, exc_info=True)
            return {
                "success": False,
                "ticket_number": None,
                "message": error_msg,
                "response": None
            }


servicenow_service = ServiceNowService()
