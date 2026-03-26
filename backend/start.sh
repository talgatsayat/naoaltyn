#!/bin/bash
set -e

echo "Creating tables and admin..."
python create_admin.py

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
