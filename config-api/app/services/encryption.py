from cryptography.fernet import Fernet
from ..config import get_settings


class EncryptionService:
    def __init__(self):
        settings = get_settings()
        self.fernet = Fernet(settings.encryption_key.encode())

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            return ""
        return self.fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext:
            return ""
        return self.fernet.decrypt(ciphertext.encode()).decode()


encryption_service = EncryptionService()


def get_encryption_service() -> EncryptionService:
    return encryption_service
