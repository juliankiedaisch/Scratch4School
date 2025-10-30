#!/bin/bash
set -e

echo "Starting Scratch4School Backend..."

# Check if we're using PostgreSQL and if SQLite database exists
if [[ "$DATABASE_URI" == postgresql* ]] && [ -f "/app/db/main.db" ]; then
    echo "PostgreSQL configured and SQLite database found."
    echo "Checking if migration is needed..."
    
    # Run migration script
    python3 /app/migrate_sqlite_to_postgres.py
    
    if [ $? -eq 0 ]; then
        echo "Migration check completed."
    else
        echo "Migration failed. Please check logs."
        exit 1
    fi
fi

# Start the application
echo "Starting Gunicorn..."
exec gunicorn -b 0.0.0.0:5008 run:app