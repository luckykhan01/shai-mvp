# SecureWatch Security Platform

Real-time security monitoring platform with ML-based anomaly detection and AI-powered threat analysis.

## Overview

SecureWatch is a microservices-based security monitoring system that provides:

- Real-time log analysis from multiple sources (authentication, firewall, application)
- Machine learning anomaly detection using Isolation Forest algorithm
- AI-powered threat analysis and recommendations
- Web-based dashboard for monitoring and management
- Automatic IP blocking based on threat detection

## Architecture

The system consists of the following microservices:

- **log-generator** - Generates security logs (auth, firewall, app events)
- **parser** - Normalizes and processes incoming log events
- **ml-detector** - ML-based anomaly detection with PostgreSQL storage
- **ai-assistant** - AI threat analysis using Google Gemini
- **frontend** - React-based web interface
- **shipper** - Batch processor for ML pipeline

### Data Flow

```
┌──────────────────┐
│  log-generators  │
│  (auth/fw/app)   │
└────────┬─────────┘
         │
         ↓
    ┌────────┐
    │ parser │  ──→  ┌─────────────┐
    └────┬───┘       │  shipper    │
         │           └──────┬──────┘
         ↓                  ↓
    ┌─────────┐      ┌─────────────┐      ┌──────────┐
    │ JSONL   │      │ ml-detector │ ←──→ │ postgres │
    │ files   │      │  (ML API)   │      └──────────┘
    └─────────┘      └──────┬──────┘
                            ↓
                     ┌──────────────┐
                     │ ai-assistant │
                     │  (Gemini AI) │
                     └──────┬───────┘
                            ↓
                     ┌──────────────┐
                     │   frontend   │
                     │  (React UI)  │
                     └──────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Make (optional, for convenience)

### Running the System

```bash
# Build and start all services
make build && make up

# Or using docker-compose directly
docker-compose up -d --build
```

### Accessing the Interface

Open your browser and navigate to:
```
http://localhost:3000
```

The web interface provides:
- Dashboard with system statistics
- Real-time anomaly monitoring
- IP address management
- Detailed IP analysis
- IP blocking/unblocking
- AI-powered chat assistant

### AI Assistant

The AI assistant can be accessed through the web interface under "AI Ассистент" tab.

Example commands (Russian):
```
Что происходит?                  # Get security status
Заблокируй IP 192.168.1.100     # Block an IP address
Разблокируй IP 192.168.1.100    # Unblock an IP address
помощь                           # Get help
```

## API Endpoints

### Frontend (port 3000)
- `GET /` - Web interface
- `GET /anomalies` - Anomalies page
- `GET /ips` - IP addresses list
- `GET /ips/:ip` - IP details

### Parser (port 8000)
- `GET /health` - Health check
- `POST /ingest` - Ingest logs
- `GET /incidents` - List incidents

### ML Detector (port 8001)
- `GET /healthz` - Health check
- `GET /anomalies` - List anomalies
- `GET /ips` - List IP addresses
- `POST /lists/deny` - Block IP
- `DELETE /lists/deny` - Unblock IP
- `POST /lists/allow` - Add IP to whitelist
- `DELETE /lists/allow` - Remove IP from whitelist

### AI Assistant (port 8002)
- `GET /health` - Health check
- `GET /status` - Security status
- `GET /summary` - Security summary
- `GET /analyze/{ip}` - Analyze specific IP
- `POST /chat` - Chat with AI assistant

## Management Commands

### Service Control

```bash
# View status
make status

# View logs
make logs              # All services
make logs-parser       # Parser only
make logs-ml          # ML detector only
make logs-frontend    # Frontend only
make logs-ai          # AI assistant only

# Restart services
make restart           # All services
make restart-parser   # Parser only
make restart-ml       # ML detector only
make restart-frontend # Frontend only
```

### Health Checks

```bash
# Check service health
make health

# View ML statistics
make ml-stats

# View incidents
make incidents
```

### Cleanup

```bash
# Stop all services
make down

# Remove all containers and volumes
make clean

# Rebuild everything
make rebuild
```

## Configuration

### Environment Variables

#### Log Generator
- `PARSER_URL` - Parser endpoint (default: http://parser:8000/ingest)
- `RATE` - Events per second (default: 5)
- `BATCH` - Batch size (default: 5)

#### AI Assistant
- `GEMINI_API_KEY` - Google Gemini API key
- `ML_DETECTOR_URL` - ML detector endpoint (default: http://ml-detector:8000)

## Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS, TanStack Query
- **Backend**: Python, FastAPI, Uvicorn
- **ML**: scikit-learn (Isolation Forest)
- **AI**: Google Gemini API
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose

## Monitoring

All services include health check endpoints and automatic restart on failure.

View resource usage:
```bash
docker stats
```

## Development

### Project Structure

```
.
├── frontend/              # React web interface
├── services/
│   ├── ai-assistant/     # AI analysis service
│   ├── log-generator/    # Log generation service
│   ├── ml-detector/      # ML anomaly detection
│   └── parser/           # Log parsing and normalization
├── docker-compose.yml    # Service orchestration
└── Makefile             # Convenience commands
```

### Adding New Features

1. Modify the relevant service
2. Rebuild the service: `docker-compose build <service-name>`
3. Restart the service: `docker-compose restart <service-name>`

## License

This project is provided as-is for educational and demonstration purposes.
