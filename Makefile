SHELL := /bin/bash

# Paths
BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV_PY := $(BACKEND_DIR)/venv/bin/python3
# Use PostgreSQL for development (matches production)
MANAGE := $(VENV_PY) $(BACKEND_DIR)/manage.py

# Default target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  setup             - Set up virtual environment and install dependencies"
	@echo "  dev-up            - Run backend (PostgreSQL) and frontend dev servers (foreground)"
	@echo "  dev-start         - Start development servers in background (PostgreSQL)"
	@echo "  dev-stop          - Stop development servers"
	@echo "  dev-restart       - Stop and restart development servers"
	@echo "  dev-status        - Check status of development servers"
	@echo "  dev-logs          - Show development server logs"
	@echo "  db-backup         - Create timestamped PostgreSQL backup"
	@echo "  db-restore        - Restore PostgreSQL from SNAPSHOT=path/to/file"
	@echo "  db-reset          - Backup, reset DB, run migrations"
	@echo "  migrate           - Apply migrations"
	@echo "  makemigrations    - Create migrations"
	@echo "  eod-complete      - Complete EOD workflow: checkpoint, push, update docs, shutdown"
	@echo "  seed-demo         - Seed demo users/data"
	@echo "  check             - Migrations check (dry-run)"
	@echo "  eod               - End-of-day: code tag + DB snapshot (MSG='note')"
	@echo "  checkpoint        - Create detailed checkpoint before major changes"
	@echo "  backup            - Create code backup (Git + local)"
	@echo "  backup-db         - Create database-only backup"
	@echo "  backup-complete   - Create complete system backup (code + DB + config)"
	@echo "  backup-working    - Create WORKING backup (code + DB) - RECOMMENDED"
	@echo "  backup-enhanced   - Create ENHANCED backup (code + DB + files + config)"
	@echo "  recover           - Recover from latest backup (BACKUP=name)"
	@echo "  validate          - Validate system integrity"

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

.PHONY: dev-restart
dev-restart:
	@echo "Restarting development servers..."
	@$(MAKE) dev-stop
	@sleep 2
	@$(MAKE) dev-start

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

.PHONY: db-sync
db-sync:
	@bash $(BACKEND_DIR)/scripts/sync_databases_simple.sh sync

.PHONY: db-sync-sqltopg
db-sync-sqltopg:
	@bash $(BACKEND_DIR)/scripts/sync_databases_simple.sh sync

.PHONY: db-sync-pgtosql
db-sync-pgtosql:
	@bash $(BACKEND_DIR)/scripts/sync_databases_simple.sh sync

.PHONY: db-compare
db-compare:
	@bash $(BACKEND_DIR)/scripts/sync_databases_simple.sh report

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

.PHONY: eod-complete
eod-complete:
	@echo "Starting complete EOD workflow..."
	@./scripts/eod_complete.sh

.PHONY: checkpoint
checkpoint:
	@echo "Creating detailed checkpoint..."
	@./scripts/checkpoint_system.sh "$(MSG)"

.PHONY: backup
backup:
	@echo "Creating code backup..."
	@./scripts/code_backup.sh

.PHONY: backup-db
backup-db:
	@echo "Creating database backup..."
	@./scripts/database_backup.sh

.PHONY: backup-complete
backup-complete:
	@echo "Creating complete system backup..."
	@./scripts/complete_system_backup.sh

.PHONY: recover
recover:
	@if [ -z "$(BACKUP)" ]; then \
		echo "Usage: make recover BACKUP=backup_name"; \
		echo "Available backups:"; \
		ls -la backups/ | grep "psychpath_backup_" | tail -5; \
		exit 1; \
	fi
	@echo "Recovering from backup: $(BACKUP)"
	@cd backups/$(BACKUP) && ./RECOVER.sh

.PHONY: validate
validate:
	@echo "Validating system integrity..."
	@./scripts/backup_system.sh --validate-only

.PHONY: backup-working
backup-working:
	@echo "Creating WORKING backup (code + database)..."
	@./scripts/working_backup.sh "$(MSG)"

.PHONY: backup-enhanced
backup-enhanced:
	@echo "Creating ENHANCED backup (code + database + files + config)..."
	@./scripts/backup_enhanced.sh "$(MSG)"


