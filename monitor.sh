#!/bin/bash

echo "📊 Shai.pro Security Platform Monitor"
echo "===================================="

while true; do
    clear
    echo "📊 Shai.pro Security Platform Monitor"
    echo "===================================="
    echo "🕐 $(date)"
    echo ""
    
    # Service status
    echo "🔧 Service Status:"
    docker-compose ps
    echo ""
    
    # Resource usage
    echo "💻 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
    
    # Recent incidents
    echo "🚨 Recent Incidents:"
    curl -s http://localhost:8000/incidents 2>/dev/null | python -m json.tool 2>/dev/null || echo "Parser not available"
    echo ""
    
    # Recent logs
    echo "📝 Recent Logs (last 5 lines):"
    docker-compose logs --tail=5 log-generator 2>/dev/null | tail -5
    echo ""
    
    echo "Press Ctrl+C to exit"
    sleep 5
done
