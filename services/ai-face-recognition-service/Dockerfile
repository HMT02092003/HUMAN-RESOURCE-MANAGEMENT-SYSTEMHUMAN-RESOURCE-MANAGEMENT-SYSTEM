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
RUN pip install --no-cache-dir --default-timeout=1000 --upgrade pip setuptools wheel
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

# Copy pre-trained models (buffalo_l + anti-spoofing)
# This avoids downloading models during container startup
COPY models /root/.insightface/models

# Copy application code
COPY . .

EXPOSE 4106

# Health check — start-period 120s để đủ thời gian load buffalo_l (~340MB) + ONNX models
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:4106/health', timeout=5)"

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4106", "--workers", "1"]
