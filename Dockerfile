# Use official Python image
FROM python:3.10-slim

# Force stdout/stderr to be unbuffered
ENV PYTHONUNBUFFERED=1

# Set working directory inside the container
WORKDIR /app

# Install build dependencies for compiling packages if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install packages
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy all backend source files into /app/backend
COPY backend/ /app/backend/

# Expose the default port expected by Hugging Face Spaces
EXPOSE 7860

# Start uvicorn server mapping port 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
