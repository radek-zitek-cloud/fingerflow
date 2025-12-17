# Backend Dockerfile for FingerFlow
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies system-wide (not --user)
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder (installed in /usr/local)
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create data directory (for compatibility, though PostgreSQL is used)
RUN mkdir -p /app/data

# Make startup script executable
RUN chmod +x start-prod.sh

# Create non-root user for security
RUN useradd -m -u 1000 fingerflow && \
    chown -R fingerflow:fingerflow /app

USER fingerflow

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with production settings
# Startup script runs migrations BEFORE starting workers (prevents race conditions)
CMD ["./start-prod.sh"]
