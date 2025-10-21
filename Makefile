SHELL := /bin/bash

# Paths
BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV_PY := $(BACKEND_DIR)/venv/bin/python3
MANAGE := $(VENV_PY) $(BACKEND_DIR)/manage.py

# Default target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  setup             - Set up virtual environment and install dependencies"
	@echo "  dev-up            - Run backend (SQLite) and frontend dev servers (foreground)"
	@echo "  dev-start         - Start development servers in background"
	@echo "  dev-stop          - Stop development servers"
	@echo "  dev-status        - Check status of development servers"
	@echo "  dev-logs          - Show development server logs"
	@echo "  backend-health    - Check backend server health"
	@echo "  backend-restart   - Restart backend server with monitoring"
	@echo "  restart-all       - Restart both backend and frontend servers"
	@echo "  db-backup         - Create timestamped SQLite backup"
	@echo "  db-restore        - Restore SQLite from SNAPSHOT=path/to/file"
	@echo "  db-reset          - Backup, reset DB, run migrations"
	@echo "  migrate           - Apply migrations"
	@echo "  makemigrations    - Create migrations"
	@echo "  seed-demo         - Seed demo users/data"
	@echo "  check             - Migrations check (dry-run)"
	@echo "  eod               - End-of-day: code tag + DB snapshot (MSG='note')"

.PHONY: setup
setup:
	@echo "Setting up virtual environment and installing dependencies..."
	@if [ ! -d "$(BACKEND_DIR)/venv" ]; then \
		echo "Creating virtual environment..."; \
		cd $(BACKEND_DIR) && python3 -m venv venv; \
	fi
	@echo "Installing Python dependencies..."
	@cd $(BACKEND_DIR) && ./venv/bin/pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	@cd $(FRONTEND_DIR) && npm install
	@echo "Setup complete!"

.PHONY: dev-up
dev-up:
	@echo "Checking if virtual environment exists..."
	@if [ ! -d "$(BACKEND_DIR)/venv" ]; then \
		echo "Virtual environment not found. Running setup..."; \
		$(MAKE) setup; \
	fi
	@echo "Starting backend (PostgreSQL) on :8000..."
	@cd $(BACKEND_DIR) && ./venv/bin/python3 manage.py runserver 0.0.0.0:8000 &
	@sleep 1
	@echo "Starting frontend on :5173..."
	@cd $(FRONTEND_DIR) && npm run dev

.PHONY: dev-start
dev-start:
	@echo "Starting development servers in background..."
	@echo "Checking if virtual environment exists..."
	@if [ ! -d "$(BACKEND_DIR)/venv" ]; then \
		echo "Virtual environment not found. Running setup..."; \
		$(MAKE) setup; \
	fi
	@echo "Starting backend (PostgreSQL) on :8000..."
	@cd $(BACKEND_DIR) && ./venv/bin/python3 manage.py runserver 0.0.0.0:8000 > ../logs/backend.log 2>&1 &
	@echo $$! > .backend.pid
	@sleep 2
	@echo "Starting frontend on :5173..."
	@cd $(FRONTEND_DIR) && npm run dev > ../logs/frontend.log 2>&1 &
	@echo $$! > .frontend.pid
	@echo "Development servers started!"
	@echo "Backend: http://localhost:8000 (PID: $$(cat .backend.pid))"
	@echo "Frontend: http://localhost:5173 (PID: $$(cat .frontend.pid))"
	@echo "Logs: logs/backend.log and logs/frontend.log"
	@echo "Use 'make dev-stop' to stop the servers"

.PHONY: dev-stop
dev-stop:
	@echo "Stopping development servers..."
	@if [ -f .backend.pid ]; then \
		echo "Stopping backend (PID: $$(cat .backend.pid))..."; \
		kill $$(cat .backend.pid) 2>/dev/null || true; \
		rm -f .backend.pid; \
	fi
	@if [ -f .frontend.pid ]; then \
		echo "Stopping frontend (PID: $$(cat .frontend.pid))..."; \
		kill $$(cat .frontend.pid) 2>/dev/null || true; \
		rm -f .frontend.pid; \
	fi
	@echo "Development servers stopped!"

.PHONY: dev-status
dev-status:
	@echo "Development server status:"
	@if [ -f .backend.pid ] && kill -0 $$(cat .backend.pid) 2>/dev/null; then \
		echo "  Backend: Running (PID: $$(cat .backend.pid))"; \
	else \
		echo "  Backend: Not running"; \
	fi
	@if [ -f .frontend.pid ] && kill -0 $$(cat .frontend.pid) 2>/dev/null; then \
		echo "  Frontend: Running (PID: $$(cat .frontend.pid))"; \
	else \
		echo "  Frontend: Not running"; \
	fi

.PHONY: dev-logs
dev-logs:
	@echo "Showing development server logs..."
	@echo "=== Backend Logs ==="
	@tail -n 20 logs/backend.log 2>/dev/null || echo "No backend logs found"
	@echo ""
	@echo "=== Frontend Logs ==="
	@tail -n 20 logs/frontend.log 2>/dev/null || echo "No frontend logs found"

.PHONY: db-backup
db-backup:
	@bash $(BACKEND_DIR)/scripts/db_backup.sh

.PHONY: db-restore
db-restore:
	@if [ -z "$(SNAPSHOT)" ]; then echo "Usage: make db-restore SNAPSHOT=backend/backups/db-YYYYmmdd-HHMMSS.sqlite3"; exit 1; fi
	@bash $(BACKEND_DIR)/scripts/db_restore.sh "$(SNAPSHOT)"

.PHONY: db-reset
db-reset:
	@bash $(BACKEND_DIR)/scripts/db_backup.sh
	@echo "Resetting SQLite database..."
	@rm -f $(BACKEND_DIR)/db.sqlite3
	@$(MANAGE) migrate --noinput

.PHONY: migrate
migrate:
	@$(MANAGE) migrate

.PHONY: makemigrations
makemigrations:
	@$(MANAGE) makemigrations

.PHONY: seed-demo
seed-demo:
	@$(MANAGE) seed_demo

.PHONY: check
check:
	@$(MANAGE) makemigrations --check --dry-run || (echo "\nERROR: Missing migrations" && exit 1)

.PHONY: eod
eod:
	@bash $(BACKEND_DIR)/scripts/eod.sh "$(MSG)"

.PHONY: backend-health
backend-health:
	@cd $(BACKEND_DIR) && ./health_check.sh

.PHONY: backend-restart
backend-restart:
	@echo "Stopping backend server..."
	@cd $(BACKEND_DIR) && pkill -f "manage.py runserver" 2>/dev/null || true
	@sleep 2
	@echo "Starting backend server with monitoring..."
	@cd $(BACKEND_DIR) && ./start_server.sh &
	@echo "Backend server restarted. Check status with: make backend-health"

.PHONY: restart-all
restart-all:
	@./restart_all.sh


