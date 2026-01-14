from cryptography.fernet import Fernet
from ..config import config


class EncryptionService:
    def __init__(self):
        if config.ENCRYPTION_KEY:
            self.fernet = Fernet(config.ENCRYPTION_KEY.encode())
        else:
            self.fernet = None

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext or not self.fernet:
            return ""
        return self.fernet.decrypt(ciphertext.encode()).decode()


encryption_service = EncryptionService()
