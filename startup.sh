#!/bin/bash

# Azure startup script to ensure proper Flask-CORS installation
echo "Starting custom startup script..."

# Ensure pip is up to date
python -m pip install --upgrade pip

# Install requirements with verbose output
python -m pip install -r requirements.txt --verbose

# Run gunicorn
exec gunicorn -w 2 -k gthread -b 0.0.0.0:$PORT app:app