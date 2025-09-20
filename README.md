# PsychPATH - Psychology Professional Assessment and Training Hub

PsychPATH is a comprehensive platform for provisional psychologists and registrars to track their training progress, log hours, and meet AHPRA requirements.

## Features

- **Role-Based Access Control**: Support for Provisional Psychologists, Registrars, Supervisors, and Organization Admins
- **Comprehensive Logbook System**: Section A (Direct Client Contact), Section B (Professional Development), Section C (Supervision)
- **Supervision Management**: Invitation system for supervisors to enroll trainees
- **Notification System**: Real-time in-app notifications for all platform events
- **Time-Limited Unlocks**: Temporary editing access for approved logbooks
- **Comment System**: Threaded commenting for supervisor-trainee communication
- **Audit Logging**: Complete audit trail for AHPRA compliance
- **Support Dashboard**: Administrative tools for system monitoring

## Technology Stack

- **Backend**: Django 4.2+ with Django REST Framework
- **Frontend**: React 18+ with TypeScript and Tailwind CSS
- **Database**: PostgreSQL 15+
- **Deployment**: Docker and Docker Compose
- **Authentication**: JWT with Argon2 password hashing

## Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd psychpath
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

3. **Run migrations**
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

4. **Create superuser**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Django Admin: http://localhost:8000/admin

### Production Deployment

1. **Configure environment variables**
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your production values
   ```

2. **Configure NGINX**
   ```bash
   cp nginx.conf.example nginx/nginx.conf
   # Update server_name and SSL certificates
   ```

3. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

## User Roles

### Provisional Psychologists (5+1 Program)
- Track 1,500 total hours (500 DCC, 80 supervision, 60 PD)
- Weekly logbook submissions for supervisor review
- Reflection requirements for all entries
- EPA competency linking

### Registrar Psychologists
- Qualification-specific hour requirements
- AoPE pathway tracking
- EPA competency mapping
- Flexible logbook structure

### Supervisors
- Review and approve trainee logbooks
- Add comments and feedback
- Manage supervision relationships
- Endorsement tracking

### Organization Admins
- Oversee organizational trainees
- System monitoring and support
- Data export and reporting

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/logout/` - User logout

### Logbooks
- `GET /api/logbooks/` - List user's logbooks
- `POST /api/logbooks/submit/` - Submit new logbook
- `GET /api/logbooks/{id}/review/` - Review logbook (supervisors)

### Supervision
- `POST /api/supervisions/invite/` - Invite supervisor/trainee
- `POST /api/supervisions/respond/` - Accept/reject invitation
- `GET /api/supervisions/pending/` - Pending requests

### Notifications
- `GET /api/notifications/` - User notifications
- `PATCH /api/notifications/{id}/read/` - Mark as read

## Database Schema

### Core Models
- `User` - Django user with profile extension
- `UserProfile` - Extended user information and role
- `Organization` - Organization management
- `Supervision` - Supervisor-trainee relationships

### Logbook Models
- `WeeklyLogbook` - Weekly logbook submissions
- `SectionAEntry` - Direct client contact entries
- `ProfessionalDevelopmentEntry` - PD activities
- `SupervisionEntry` - Supervision sessions

### Communication Models
- `CommentThread` - Comment threads on entries
- `CommentMessage` - Individual comments
- `Notification` - In-app notifications

## Security Features

- **Password Security**: Argon2id hashing
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: API endpoint protection
- **CORS Configuration**: Cross-origin request control
- **Audit Logging**: Complete action tracking
- **Data Isolation**: Role-based data access

## Development

### Backend Development
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

**PsychPATH** - Empowering psychology professionals with comprehensive training management tools.
