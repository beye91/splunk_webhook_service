import logging
from datetime import datetime
from flask import Flask, jsonify, request

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
log = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)

# Track service start time
SERVICE_START_TIME = datetime.utcnow()


# Request logging middleware
@app.before_request
def log_request_info():
    log.info("=" * 60)
    log.info(f"INCOMING REQUEST: {request.method} {request.path}")
    log.info(f"Remote Address: {request.remote_addr}")
    log.debug(f"Headers: {dict(request.headers)}")


# Response logging middleware
@app.after_request
def log_response_info(response):
    log.info(f"RESPONSE: {response.status_code} for {request.method} {request.path}")
    return response


# Health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    uptime = datetime.utcnow() - SERVICE_START_TIME
    health_info = {
        "status": "healthy",
        "service": "Splunk Webhook Service",
        "version": "2.0.0",
        "start_time": SERVICE_START_TIME.isoformat(),
        "uptime_seconds": int(uptime.total_seconds()),
        "endpoints": {
            "POST /webhook": "Main webhook handler for Splunk alerts",
            "GET /webhook": "Info page",
            "POST /webhook/echo": "Debug echo endpoint",
            "GET /health": "This health check"
        }
    }
    log.info(f"Health check requested - Uptime: {uptime}")
    return jsonify(health_info), 200


# Root endpoint
@app.route("/", methods=["GET"])
def root():
    return jsonify({
        "service": "Splunk Webhook Service",
        "version": "2.0.0",
        "health": "/health",
        "webhook": "/webhook"
    }), 200


# Import and register webhook routes
from .routes.webhook import webhook_bp
app.register_blueprint(webhook_bp)


# Startup logging
log.info("=" * 80)
log.info("STARTING SPLUNK WEBHOOK SERVICE v2.0")
log.info("=" * 80)
log.info(f"Service Start Time: {SERVICE_START_TIME}")
log.info("Available Endpoints:")
log.info("  POST /webhook - Main webhook handler for Splunk alerts")
log.info("  POST /webhook/echo - Debug echo endpoint")
log.info("  GET  /webhook - Info page")
log.info("  GET  /health - Health check with service info")
log.info("=" * 80)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
