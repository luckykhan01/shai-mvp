FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY generator.py .

# Environment defaults can be overridden by compose/.env
ENV PARSER_URL="http://parser:8000/ingest"
ENV RATE="5"
ENV BATCH="5"

CMD ["python", "generator.py"]
