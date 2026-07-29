# ===============================================
# Bellwether SWE E-Commerce - Makefile
# ===============================================
# Common development and deployment commands

.PHONY: help install dev prod-build prod-up prod-down test lint clean db-reset

# Default target
help:
	@echo "Bellwether SWE E-Commerce Platform"
	@echo ""
	@echo "Available targets:"
	@echo "  install      - Install all dependencies"
	@echo "  dev          - Start local development environment"
	@echo "  dev:api      - Start API only"
	@echo "  dev:web      - Start web frontend only"
	@echo "  dev:ai       - Start AI service only"
	@echo "  prod-build   - Build production Docker images"
	@echo "  prod-up      - Start production environment"
	@echo "  prod-down    - Stop production environment"
	@echo "  test         - Run all tests"
	@echo "  test:api     - Run API tests"
	@echo "  test:web     - Run web tests"
	@echo "  test:ai      - Run AI service tests"
	@echo "  lint         - Run linters"
	@echo "  lint:fix     - Fix linting issues"
	@echo "  clean        - Clean build artifacts"
	@echo "  db-reset     - Reset database (development only)"
	@echo "  db:seed      - Seed database with sample data"
	@echo "  prisma:gen   - Generate Prisma client"

# ===============================================
# Installation
# ===============================================
install:
	npm install

# ===============================================
# Development
# ===============================================
dev:
	docker-compose up -d
	@echo "Services starting..."
	@echo "  API:  http://localhost:3001"
	@echo "  Web:  http://localhost:3000"
	@echo "  AI:   http://localhost:8000"
	@echo "  API Docs: http://localhost:3001/docs"

dev:api:
	docker-compose up -d postgres redis
	cd apps/api && npm run start:dev

dev:web:
	docker-compose up -d postgres redis api
	cd apps/web && npm run dev

dev:ai:
	docker-compose up -d postgres
	cd apps/ai-service && uvicorn app.main:app --reload

# ===============================================
# Production Docker
# ===============================================
prod-build:
	docker build -f Dockerfile.api -t bellwether/api:latest .
	docker build -f Dockerfile.web -t bellwether/web:latest .
	docker build -f Dockerfile.ai -t bellwether/ai:latest .

prod-up:
	docker-compose -f docker-compose.production.yml up -d

prod-down:
	docker-compose -f docker-compose.production.yml down

prod-logs:
	docker-compose -f docker-compose.production.yml logs -f

# ===============================================
# Testing
# ===============================================
test:
	npm test --workspaces --if-present

test:api:
	cd apps/api && npm test

test:web:
	cd apps/web && npm test

test:ai:
	cd apps/ai-service && pytest

test:e2e:
	cd apps/api && npm run test:e2e

# ===============================================
# Linting
# ===============================================
lint:
	npm run lint --workspaces --if-present

lint:fix:
	npm run lint --workspaces --if-present -- --fix

# ===============================================
# Cleaning
# ===============================================
clean:
	rm -rf node_modules/.cache
	rm -rf **/.next
	rm -rf **/dist
	rm -rf **/build
	rm -rf apps/api/generated
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

# ===============================================
# Database
# ===============================================
db-reset:
	cd apps/api && npx prisma migrate reset --force

db:seed:
	cd apps/api && npx prisma db seed

prisma:gen:
	cd apps/api && npx prisma generate

db:migrate:
	cd apps/api && npx prisma migrate deploy

# ===============================================
# CI/CD
# ===============================================
ci: lint test

# ===============================================
# Documentation
# ===============================================
docs:api:
	@echo "API documentation available at: http://localhost:3001/docs"

# ===============================================
# Deployment (Render)
# ===============================================
deploy:staging:
	@echo "Deploying to Render staging..."
	@echo "Use Render dashboard or 'render blueprint apply' with render.staging.yaml"

deploy:production:
	@echo "Deploying to Render production..."
	@echo "Use Render dashboard or 'render blueprint apply' with render.yaml"
