# AI Face Recognition Service Dockerfile (Python/FastAPI)
FROM python:3.11-slim

# Install system dependencies (added libgl1 libglib2.0-0 for OpenCV)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    g++ \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 4006

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:4006/health', timeout=3)"

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4006", "--workers", "1"]
