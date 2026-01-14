import os


class Config:
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://webhook:password@localhost:5432/webhook_admin")
    ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "")
    CONFIG_API_URL = os.environ.get("CONFIG_API_URL", "http://localhost:8000")


config = Config()
