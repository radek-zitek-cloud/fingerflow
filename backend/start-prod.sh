#!/bin/bash
# Production startup script
# Runs migrations BEFORE starting multi-worker server

set -e

echo "Starting FingerFlow backend..."

# Run migrations (single process, no race conditions)
echo "Running database migrations..."
python migrate.py

# Start uvicorn with multiple workers
echo "Starting uvicorn with 4 workers..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
