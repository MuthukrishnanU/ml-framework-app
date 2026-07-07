# ==========================================
# Production Dockerfile for Hugging Face Spaces (Backend Only)
# ==========================================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies needed for python compiling
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements list and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend codebase
COPY backend/ ./backend

# Copy data seeder/simulation scripts
COPY data/ ./data

# Expose default HuggingFace Space port (Hugging Face routes incoming traffic here)
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV DATABASE_URL=""

# Run backend worker daemon on port 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
