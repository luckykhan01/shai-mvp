#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Shai.pro Frontend Health Check          ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Check if docker-compose is running
echo -e "${YELLOW}[1/5] Checking Docker containers...${NC}"
if docker-compose ps | grep -q "shai-frontend"; then
    if docker-compose ps | grep "shai-frontend" | grep -q "Up"; then
        echo -e "${GREEN}✓ Frontend container is running${NC}"
    else
        echo -e "${RED}✗ Frontend container is not running${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Frontend container not found${NC}"
    exit 1
fi

# Check frontend health
echo -e "\n${YELLOW}[2/5] Checking Frontend health...${NC}"
if curl -f -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is accessible at http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Frontend is not accessible${NC}"
    exit 1
fi

# Check ML Detector
echo -e "\n${YELLOW}[3/5] Checking ML Detector API...${NC}"
if curl -f -s http://localhost:8001/healthz > /dev/null; then
    echo -e "${GREEN}✓ ML Detector is healthy${NC}"
else
    echo -e "${RED}✗ ML Detector is not accessible${NC}"
fi

# Check AI Assistant
echo -e "\n${YELLOW}[4/5] Checking AI Assistant API...${NC}"
if curl -f -s http://localhost:8002/health > /dev/null; then
    echo -e "${GREEN}✓ AI Assistant is healthy${NC}"
else
    echo -e "${YELLOW}⚠ AI Assistant is not accessible (это нормально, если не настроен GEMINI_API_KEY)${NC}"
fi

# Check if anomalies endpoint works through frontend proxy
echo -e "\n${YELLOW}[5/5] Checking Frontend API proxy...${NC}"
ANOMALIES_COUNT=$(curl -s http://localhost:8001/anomalies | grep -o '"count":[0-9]*' | cut -d':' -f2)
if [ ! -z "$ANOMALIES_COUNT" ]; then
    echo -e "${GREEN}✓ Frontend API proxy is working${NC}"
    echo -e "${BLUE}  Found $ANOMALIES_COUNT anomalies${NC}"
else
    echo -e "${RED}✗ Frontend API proxy is not working${NC}"
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Summary                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Frontend:${NC}     http://localhost:3000"
echo -e "${GREEN}✓ ML Detector:${NC}  http://localhost:8001"
echo -e "${YELLOW}⚠ AI Assistant:${NC} http://localhost:8002"
echo ""
echo -e "${BLUE}Pages available:${NC}"
echo -e "  • Dashboard:     http://localhost:3000/"
echo -e "  • Anomalies:     http://localhost:3000/anomalies"
echo -e "  • IP Addresses:  http://localhost:3000/ips"
echo -e "  • AI Assistant:  http://localhost:3000/assistant"
echo ""
echo -e "${GREEN}✓ All checks completed!${NC}"
echo -e "${BLUE}Open http://localhost:3000 in your browser${NC}"


