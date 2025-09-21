.PHONY: build up down logs clean restart status

# Build all services
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Start with logs
up-logs:
	docker-compose up

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# View logs for specific service
logs-parser:
	docker-compose logs -f parser

logs-ml:
	docker-compose logs -f ml-detector

logs-shipper:
	docker logs shai-shipper --tail 20

logs-postgres:
	docker logs shai-postgres --tail 20

logs-generator:
	docker-compose logs -f log-generator

# Логи конкретных генераторов
logs-auth:
	docker logs shai-auth-generator --tail 20

logs-fw:
	docker logs shai-fw-generator --tail 20

logs-app:
	docker logs shai-app-generator --tail 20

# Логи всех генераторов
logs-generators:
	@echo "=== ЛОГИ ВСЕХ ГЕНЕРАТОРОВ ==="
	@echo "Auth Generator:"
	@docker logs shai-auth-generator --tail 3
	@echo -e "\nFW Generator:"
	@docker logs shai-fw-generator --tail 3
	@echo -e "\nApp Generator:"
	@docker logs shai-app-generator --tail 3

# Restart all services
restart:
	docker-compose restart

# Restart specific service
restart-parser:
	docker-compose restart parser

restart-ml:
	docker-compose restart ml-detector

restart-generator:
	docker-compose restart log-generator

# Check status
status:
	docker-compose ps

# Clean up
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Full rebuild
rebuild: clean build up

# Health check
health:
	@echo "Checking parser health..."
	@curl -f http://localhost:8000/health || echo "Parser is down"
	@echo "Checking ML detector health..."
	@curl -f http://localhost:8001/healthz || echo "ML detector is down"

# Show parsed logs
test-parser:
	@echo "Recent parsed logs:"
	@curl -s http://localhost:8000/ingest -X POST -H "Content-Type: application/json" -d '{"lines":["Sep 20 12:01:33 server1 sshd[1234]: Failed password for root from 185.23.54.11 port 54321 ssh2"]}'

# Show incidents (placeholder - parser doesn't have incidents endpoint anymore)
incidents:
	@curl -s http://localhost:8000/incidents | (command -v jq >/dev/null && jq . || (command -v python3 >/dev/null && python3 -m json.tool || cat))



# Show ML statistics
ml-stats:
	@echo "ML Detection Statistics:"
	@curl -s http://localhost:8001/healthz

# Test ML scoring
test-ml:
	@echo "Testing ML scoring:"
	@curl -s http://localhost:8001/score -X POST -H "Content-Type: application/json" -d '{"events":[{"src_ip":"185.23.54.11","message":"Failed password for root"}]}'

# Demo commands
demo-test:
	@echo "Testing log parsing with sample data"
	@curl -X POST http://localhost:8000/ingest \
		-H "Content-Type: application/json" \
		-d '{"lines":["Sep 20 12:01:33 server1 sshd[1234]: Failed password for root from 185.23.54.11 port 54321 ssh2","2025-09-20T12:02:10Z firewall: DENY TCP 185.23.54.11:443 -> 10.0.0.5:22"]}'

# Run demo script
demo:
	@./demo.sh

# Run monitor
monitor:
	@./monitor.sh

# Scale log generator
scale-generator:
	@echo "Scaling log generator to 3 instances..."
	@docker-compose up -d --scale log-generator=3

# Performance test
perf-test:
	@echo "Running performance test..."
	@for i in {1..10}; do \
		curl -s -X POST http://localhost:8000/ingest \
			-H "Content-Type: application/json" \
			-d '[{"timestamp":"2024-01-01T00:00:00Z","event_id":"test-'$$i'","src_ip":"192.168.1.'$$i'","message":"Test event '$$i'","severity":"info"}]' > /dev/null; \
	done
	@echo "Sent 10 test events"
