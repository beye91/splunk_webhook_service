from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from .config import get_settings
from .routers import auth, llm_providers, servicenow, smtp, alert_types, webhook_logs, users, webhook_test

settings = get_settings()

app = FastAPI(
    title="Splunk Webhook Admin API",
    description="Configuration API for Splunk to ServiceNow/Email webhook service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
origins = [origin.strip() for origin in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(llm_providers.router, prefix="/api/v1")
app.include_router(servicenow.router, prefix="/api/v1")
app.include_router(smtp.router, prefix="/api/v1")
app.include_router(alert_types.router, prefix="/api/v1")
app.include_router(webhook_logs.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(webhook_test.router, prefix="/api/v1")

SERVICE_START_TIME = datetime.utcnow()


@app.get("/health")
def health_check():
    uptime = datetime.utcnow() - SERVICE_START_TIME
    return {
        "status": "healthy",
        "service": "Splunk Webhook Config API",
        "version": "1.0.0",
        "start_time": SERVICE_START_TIME.isoformat(),
        "uptime_seconds": int(uptime.total_seconds())
    }


@app.get("/")
def root():
    return {
        "service": "Splunk Webhook Admin API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
