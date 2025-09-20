PsychPATH Deployment

This repository contains the production-grade deployment configuration for PsychPATH, a full-stack web application built to support provisional psychologists and supervisors through milestone tracking, supervision workflows, and AHPRA-aligned reflection processes.

PsychPATH was previously known as CAPE and is now rebranded to reflect its expanded scope.

PsychPATH is built using a modern full-stack architecture:
	•	Frontend: React (Vite + TypeScript)
	•	Backend: Django + Django REST Framework
	•	Database: PostgreSQL
	•	Web Server: NGINX (reverse proxy)
	•	Containerisation: Docker + Docker Compose
	•	Infrastructure: Oracle Cloud (Ubuntu 22.04 VPS)

⸻

Project Structure

psychpath-deployment/
├── backend/              # Django app (API, admin, migrations)
├── frontend/             # React frontend (Vite)
├── postgres/             # DB init scripts
├── nginx/                # NGINX config & SSL (optional)
├── backups/              # Backup scripts and cron setup
├── docker-compose.yml    # Local dev deployment
├── docker-compose.prod.yml # Production deployment
├── .env                  # Dev environment variables
├── .env.production       # Production environment variables

⸻

Deployment Instructions
	1.	Clone this repo:

git clone https://github.com/theppl-support/psychpath-deployment.git
cd psychpath-deployment
	2.	Configure your environment:

cp .env.production .env
nano .env
	3.	Build and launch containers:

docker-compose -f docker-compose.prod.yml up -d –build
	4.	Apply database migrations:

docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
	5.	Create a superuser:

docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

⸻

Security & Access

The development environment is currently hosted via IP at http://168.138.2.101. SSL and domain-based access (https://psychpath.com.au) will be configured once DNS is live, using Let’s Encrypt. Core security measures in this deployment include UFW, fail2ban, Docker healthchecks, and internal service isolation via Docker Compose.

⸻

Status

Environment: Dev
Status: ✅ Live
URL: http://168.138.2.101

Environment: Prod
Status: 🔜 Pending
URL: https://psychpath.com.au

⸻

Notes
	•	This app was previously named CAPE. You may still see cape_ prefixes in code or configuration, which will be updated over time.
	•	Icons and branding assets will be updated in a future commit.
	•	This repository focuses on infrastructure and functional deployment readiness. Frontend visual and branding elements may not yet reflect the final PsychPATH identity.

⸻

Contact

Created and maintained by the team at PsychPATH
For deployment support, contact: support@theppl.com.au
