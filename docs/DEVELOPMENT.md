# Development Guide

## Project Structure

```
splunk_weberhook_serviceNow/
├── docker-compose.yml          # Container orchestration
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment template
│
├── config-api/                 # FastAPI Configuration Service
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI application
│       ├── config.py           # Settings management
│       ├── database.py         # SQLAlchemy session
│       ├── models/
│       │   ├── orm.py          # SQLAlchemy models
│       │   └── schemas.py      # Pydantic schemas
│       ├── services/
│       │   ├── auth.py         # JWT authentication
│       │   └── encryption.py   # Fernet encryption
│       └── routers/
│           ├── auth.py
│           ├── llm_providers.py
│           ├── servicenow.py
│           ├── smtp.py
│           ├── alert_types.py
│           ├── webhook_logs.py
│           └── webhook_test.py
│
├── webhook-service/            # Flask Webhook Processor
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # Flask application
│       ├── config.py           # Configuration
│       ├── database.py         # SQLAlchemy session
│       ├── models/
│       │   └── orm.py          # ORM models
│       ├── utils/
│       │   └── encryption.py   # Credential decryption
│       ├── routes/
│       │   └── webhook.py      # Webhook handlers
│       └── services/
│           ├── llm_service.py
│           ├── servicenow_service.py
│           └── smtp_service.py
│
├── admin-ui/                   # Next.js Admin Interface
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/                # Next.js App Router
│       │   ├── page.tsx        # Root redirect
│       │   ├── layout.tsx      # Root layout
│       │   ├── login/
│       │   ├── dashboard/
│       │   ├── alert-types/
│       │   ├── llm-config/
│       │   ├── servicenow/
│       │   ├── email/
│       │   ├── logs/
│       │   └── test-webhook/
│       ├── components/
│       │   ├── ui/             # Reusable UI components
│       │   ├── layout/         # Layout components
│       │   └── alerts/         # Alert-specific components
│       ├── lib/
│       │   ├── api.ts          # API client
│       │   └── utils.ts        # Utilities
│       └── types/
│           └── index.ts        # TypeScript types
│
├── init-scripts/               # Database initialization
│   ├── 01_schema.sql           # Schema definitions
│   └── 02_seed_data.sql        # Initial data
│
└── docs/                       # Documentation
    ├── README.md
    ├── ARCHITECTURE.md
    ├── INSTALLATION.md
    ├── CONFIGURATION.md
    ├── API.md
    ├── USER_GUIDE.md
    ├── TROUBLESHOOTING.md
    └── DEVELOPMENT.md
```

## Local Development Setup

### Prerequisites

- Docker Desktop
- Python 3.12+
- Node.js 20+
- Git

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd splunk_weberhook_serviceNow

# Copy environment file
cp .env.example .env

# Edit .env with development settings
nano .env
```

### Start Development Environment

```bash
# Build and start all services
docker compose up -d --build

# Watch logs
docker compose logs -f
```

### Development with Hot Reload

For faster development, run services outside Docker:

#### Config API (FastAPI)

```bash
cd config-api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://webhook_user:WebhookAdmin2024!@localhost:5433/webhook_admin"
export ENCRYPTION_KEY="your-key"
export JWT_SECRET="your-secret"
export CORS_ORIGINS="http://localhost:3000"

# Run with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Webhook Service (Flask)

```bash
cd webhook-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://webhook_user:WebhookAdmin2024!@localhost:5433/webhook_admin"
export ENCRYPTION_KEY="your-key"

# Run with hot reload
flask run --debug --host 0.0.0.0 --port 5000
```

#### Admin UI (Next.js)

```bash
cd admin-ui

# Install dependencies
npm install

# Set environment variable
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Run development server
npm run dev
```

## Code Conventions

### Python (Config API & Webhook Service)

- **Style**: Follow PEP 8
- **Type Hints**: Use type annotations for function parameters and returns
- **Imports**: Group by stdlib, third-party, local
- **Docstrings**: Use Google style docstrings

```python
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

def create_alert_type(
    alert_data: schemas.AlertTypeCreate,
    db: Session = Depends(get_db),
    current_user: orm.User = Depends(get_current_user)
) -> schemas.AlertTypeResponse:
    """Create a new alert type.

    Args:
        alert_data: Alert type creation data
        db: Database session
        current_user: Authenticated user

    Returns:
        Created alert type response

    Raises:
        HTTPException: If mnemonic already exists
    """
    pass
```

### TypeScript (Admin UI)

- **Style**: Use Prettier for formatting
- **Types**: Define interfaces for all data structures
- **Components**: Use functional components with hooks
- **State**: Use TanStack Query for server state

```typescript
interface AlertType {
  id: number;
  mnemonic: string;
  display_name: string;
  enabled: boolean;
}

export default function AlertTypesPage() {
  const { data: alertTypes, isLoading } = useQuery({
    queryKey: ['alertTypes'],
    queryFn: getAlertTypes,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <DashboardLayout>
      {/* Component content */}
    </DashboardLayout>
  );
}
```

### Database

- **Naming**: Use snake_case for tables and columns
- **Constraints**: Always add foreign keys with appropriate ON DELETE actions
- **Indexes**: Add indexes for frequently queried columns
- **Timestamps**: Include created_at and updated_at where appropriate

```sql
CREATE TABLE alert_types (
    id SERIAL PRIMARY KEY,
    mnemonic VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_types_mnemonic ON alert_types(mnemonic);
```

## Testing

### Manual Testing

```bash
# Test webhook endpoint
curl -X POST "http://localhost:5001/webhook" \
  -H "Content-Type: application/json" \
  -d '{"result":{"mnemonic":"DUP_SRC_IP","host":"test","vendor":"Cisco","message_text":"test"}}'

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:5001/health
```

### API Testing with HTTPie

```bash
# Install HTTPie
pip install httpie

# Login
http --form POST :8000/api/v1/auth/login username=admin password=Admin123!

# Use token for authenticated requests
http GET :8000/api/v1/alert-types "Authorization: Bearer <token>"
```

## Database Migrations

Currently using init scripts. For future migrations:

```bash
# Connect to database
docker exec -it splunk-webhook-db psql -U webhook_user -d webhook_admin

# Run migration SQL
\i migration.sql

# Verify changes
\dt  # List tables
\d+ table_name  # Describe table
```

## Adding New Features

### Adding a New API Endpoint

1. **Define Pydantic schema** in `config-api/app/models/schemas.py`:
   ```python
   class NewFeatureCreate(BaseModel):
       name: str
       value: int

   class NewFeatureResponse(BaseModel):
       id: int
       name: str
       value: int
   ```

2. **Add ORM model** in `config-api/app/models/orm.py`:
   ```python
   class NewFeature(Base):
       __tablename__ = "new_features"

       id = Column(Integer, primary_key=True)
       name = Column(String(100), nullable=False)
       value = Column(Integer, default=0)
   ```

3. **Create router** in `config-api/app/routers/new_feature.py`:
   ```python
   from fastapi import APIRouter, Depends
   from ..models import orm, schemas

   router = APIRouter(prefix="/new-features", tags=["New Features"])

   @router.get("", response_model=List[schemas.NewFeatureResponse])
   def list_features(db: Session = Depends(get_db)):
       return db.query(orm.NewFeature).all()
   ```

4. **Register router** in `config-api/app/main.py`:
   ```python
   from .routers import new_feature
   app.include_router(new_feature.router, prefix="/api/v1")
   ```

5. **Add database table** in `init-scripts/01_schema.sql`:
   ```sql
   CREATE TABLE new_features (
       id SERIAL PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       value INTEGER DEFAULT 0
   );
   ```

### Adding a New Admin UI Page

1. **Create page** at `admin-ui/src/app/new-feature/page.tsx`:
   ```typescript
   'use client';

   import { useQuery } from '@tanstack/react-query';
   import DashboardLayout from '@/components/layout/DashboardLayout';

   export default function NewFeaturePage() {
     const { data, isLoading } = useQuery({
       queryKey: ['newFeatures'],
       queryFn: getNewFeatures,
     });

     return (
       <DashboardLayout>
         <h1>New Feature</h1>
         {/* Page content */}
       </DashboardLayout>
     );
   }
   ```

2. **Add API function** in `admin-ui/src/lib/api.ts`:
   ```typescript
   export const getNewFeatures = async () => {
     const response = await api.get('/new-features');
     return response.data;
   };
   ```

3. **Add types** in `admin-ui/src/types/index.ts`:
   ```typescript
   export interface NewFeature {
     id: number;
     name: string;
     value: number;
   }
   ```

4. **Add navigation** in `admin-ui/src/components/layout/Sidebar.tsx`:
   ```typescript
   const navigation = [
     // ... existing items
     { name: 'New Feature', href: '/new-feature', icon: Star },
   ];
   ```

## Building for Production

### Build All Containers

```bash
docker compose build --no-cache
```

### Build Single Container

```bash
docker compose build --no-cache config-api
```

### Push to Registry

```bash
# Tag images
docker tag splunk_weberhook_servicenow-config-api registry.example.com/webhook-config-api:latest

# Push
docker push registry.example.com/webhook-config-api:latest
```

## Git Workflow

### Commit Messages

Use conventional commits:

```
feat: Add email recipient management
fix: Resolve bcrypt password validation issue
docs: Update API documentation
refactor: Extract encryption service
chore: Update dependencies
```

### Branching

```bash
# Feature branch
git checkout -b feature/new-feature

# Bug fix branch
git checkout -b fix/bug-description

# Merge to main
git checkout main
git merge feature/new-feature
```

## Debugging

### Enable Debug Logging

```python
# In webhook-service/app/main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Debug Database Queries

```python
# Enable SQLAlchemy echo
engine = create_engine(DATABASE_URL, echo=True)
```

### Debug Docker Networking

```bash
# Enter container shell
docker compose exec webhook-service bash

# Test connectivity
curl http://config-api:8000/health
curl http://postgres:5432
```

## Performance Profiling

### API Response Times

```bash
# Time an API call
time curl http://localhost:8000/api/v1/alert-types

# With HTTPie
http --print=h GET :8000/api/v1/alert-types
```

### Database Query Analysis

```sql
-- Enable timing
\timing on

-- Analyze query
EXPLAIN ANALYZE SELECT * FROM webhook_logs WHERE mnemonic = 'DUP_SRC_IP';
```

## Security Considerations

### Never Commit

- `.env` files with real credentials
- API keys or secrets in code
- Database dumps with sensitive data

### Code Review Checklist

- [ ] No hardcoded credentials
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use ORM)
- [ ] XSS prevention in frontend
- [ ] Proper error handling (no sensitive info leaked)
- [ ] Authentication required on protected endpoints
