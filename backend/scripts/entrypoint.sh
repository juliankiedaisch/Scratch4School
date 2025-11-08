#!/bin/bash
set -e

echo "Starting Scratch4School Backend..."

# Start the application
echo "Starting Gunicorn..."
exec gunicorn -b 0.0.0.0:5008 run:app