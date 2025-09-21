#!/bin/bash

echo "🚀 Starting Shai.pro Security Platform Demo"
echo "=========================================="

# Build and start services
echo "📦 Building and starting services..."
make build
make up

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
echo "🏥 Checking service health..."
make health

# Show status
echo "📊 Service status:"
make status

# Show incidents after some time
echo "🔍 Waiting for incidents to be generated..."
sleep 15

echo "📋 Current incidents:"
make incidents

echo ""
echo "✅ Demo is running!"
echo ""
echo "🌐 Available endpoints:"
echo "   Parser API:    http://localhost:8000"
echo "   ML Detector:   http://localhost:8001"
echo "   Incidents:     http://localhost:8000/incidents"
echo ""
echo "📝 Useful commands:"
echo "   make logs          - view all logs"
echo "   make incidents     - view incidents"
echo "   make demo-block    - simulate IP block"
echo "   make down          - stop services"
echo ""
echo "🎯 Try: make demo-block"
