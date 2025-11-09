# Use the official Python image from the Docker Hub
FROM python:3.12-slim

# Set environment variables for better Python behavior in containers
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install dependencies
RUN pip install --no-cache-dir flask gunicorn ollama openai requests

# Copy the application code to the container
COPY llmwebhook.py /app/llmwebhook.py

# Set the working directory
WORKDIR /app

# Expose the port the app runs on
EXPOSE 5000

# Start the Gunicorn server with enhanced logging
# -b: bind to all interfaces on port 5000
# -w: number of worker processes (4 is good for I/O bound tasks)
# --log-level: set log level to debug for detailed logging
# --access-logfile: log all requests to stdout
# --error-logfile: log all errors to stderr
# --capture-output: capture stdout/stderr of Flask app
CMD gunicorn -b 0.0.0.0:5000 \
    -w 4 \
    --log-level debug \
    --access-logfile - \
    --error-logfile - \
    --capture-output \
    --timeout 120 \
    llmwebhook:app
