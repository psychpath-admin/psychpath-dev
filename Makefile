SHELL := /bin/bash

# Paths
BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV_PY := $(BACKEND_DIR)/venv/bin/python3
MANAGE := USE_SQLITE=1 $(VENV_PY) $(BACKEND_DIR)/manage.py

# Default target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  dev-up            - Run backend (SQLite) and frontend dev servers"
	@echo "  db-backup         - Create timestamped SQLite backup"
	@echo "  db-restore        - Restore SQLite from SNAPSHOT=path/to/file"
	@echo "  db-reset          - Backup, reset DB, run migrations"
	@echo "  migrate           - Apply migrations"
	@echo "  makemigrations    - Create migrations"
	@echo "  seed-demo         - Seed demo users/data"
	@echo "  check             - Migrations check (dry-run)"
	@echo "  eod               - End-of-day: code tag + DB snapshot (MSG='note')"

.PHONY: dev-up
dev-up:
	@echo "Starting backend (SQLite) on :8000..."
	@cd $(BACKEND_DIR) && USE_SQLITE=1 $(VENV_PY) manage.py runserver 0.0.0.0:8000 &
	@sleep 1
	@echo "Starting frontend on :5173..."
	@cd $(FRONTEND_DIR) && npm run dev

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


