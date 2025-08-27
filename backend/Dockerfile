FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app ./app
COPY run.py .

EXPOSE 5008

ENV FLASK_ENV=production
ENV FLASK_APP=run.py

# Ensure the folders exist (but let them be overwritten by volumes)
RUN mkdir -p /app/uploads /app/db
RUN mkdir -p /app/uploads/thumbnails /app/uploads/projects

CMD ["gunicorn", "-b", "0.0.0.0:5008", "run:app"]