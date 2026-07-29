# Bellwether SWE E-Commerce - Deployment Guide

This guide covers deploying the Bellwether SWE E-Commerce Platform to Render.

## Prerequisites

- [Render Account](https://render.com) with appropriate plan
- [GitHub Repository](https://github.com) with this codebase
- Domain name (optional, for production)

## Architecture Overview

The platform consists of 4 services:

| Service | Type | Description |
|---------|------|-------------|
| `bellwetherswe-api` | Web | NestJS API server |
| `bellwetherswe-web` | Web | Next.js storefront |
| `bellwetherswe-ai` | Web | FastAPI AI service |
| `bellwetherswe-worker` | Worker | BullMQ notifications worker |

Plus managed infrastructure:
- PostgreSQL 16 database
- Redis 7 instance

## Deployment Steps

### 1. Fork or Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/bellwether-swe-ecommerce.git
cd bellwether-swe-ecommerce
```

### 2. Create a Render Blueprint

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Navigate to **Blueprints**
3. Click **New Blueprint Instance**
4. Connect your GitHub repository
5. Select `render.yaml` for production or `render.staging.yaml` for staging

### 3. Configure Environment Variables

The following variables must be set manually in the Render dashboard (they are marked `sync: false` in render.yaml):

#### API Service
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `KEYCLOAK_ISSUER_URL` | Keycloak issuer URL | Besbpo ID admin console |
| `KEYCLOAK_JWKS_URI` | Keycloak JWKS URI | Besbpo ID admin console |
| `PAYFAST_MERCHANT_ID` | PayFast merchant ID | PayFast merchant account |
| `PAYFAST_MERCHANT_KEY` | PayFast merchant key | PayFast merchant account |
| `PAYFAST_PASSPHRASE` | PayFast passphrase | PayFast merchant account |
| `SENTRY_DSN` | Sentry DSN for error tracking | Sentry dashboard |
| `SHIPLOGIC_API_KEY` | ShipLogic API key | ShipLogic dashboard |
| `WAREHOUSE_STREET_ADDRESS` | Warehouse street address | Your location |
| `WAREHOUSE_LOCAL_AREA` | Warehouse local area | Your location |
| `WAREHOUSE_CITY` | Warehouse city | Your location |
| `WAREHOUSE_ZONE` | Warehouse zone/region | Your location |
| `WAREHOUSE_POSTAL_CODE` | Warehouse postal code | Your location |

#### Web Service
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `AUTH_KEYCLOAK_SECRET` | Keycloak client secret | Besbpo ID admin console |
| `SENTRY_DSN` | Sentry DSN for error tracking | Sentry dashboard |
| `NEXT_PUBLIC_SENTRY_DSN` | Public Sentry DSN | Sentry dashboard |
| `SENTRY_ORG` | Sentry organization | Sentry dashboard |
| `SENTRY_PROJECT` | Sentry project | Sentry dashboard |

#### AI Service
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SENTRY_DSN` | Sentry DSN for error tracking | Sentry dashboard |
| `ANTHROPIC_API_KEY` | Anthropic API key | Anthropic console |

#### Worker Service
| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `BULKSMS_TOKEN_ID` | BulkSMS token ID | BulkSMS account |
| `BULKSMS_TOKEN_SECRET` | BulkSMS token secret | BulkSMS account |
| `SENTRY_DSN` | Sentry DSN for error tracking | Sentry dashboard |

### 4. Configure Custom Domains (Production)

For production, configure custom domains:

- **Web**: `bellwetherswe.shop` → points to `bellwetherswe-web`
- **API**: `api.bellwetherswe.shop` → points to `bellwetherswe-api`

Update the following environment variables after domain configuration:
- `PUBLIC_WEB_URL=https://bellwetherswe.shop`
- `PUBLIC_API_URL=https://api.bellwetherswe.shop`

### 5. Initial Database Setup

After the first deployment:

```bash
# Connect to the database
# Run in Render Shell or via psql

# Apply migrations (handled automatically by startCommand)
# Or manually:
cd apps/api
npx prisma migrate deploy

# Seed sample data (optional but recommended for preview)
npx prisma db seed
```

## Staging Environment

A separate staging environment is available at `render.staging.yaml`:

1. Create a new Blueprint instance
2. Select `render.staging.yaml` instead of `render.yaml`
3. This creates:
   - `bellwetherswe-api-staging`
   - `bellwetherswe-web-staging`
   - `bellwetherswe-ai-staging`
   - `bellwetherswe-worker-staging`
   - Separate database and Redis

## Local Development with Docker

For local development:

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d api

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Health Checks

All services have health check endpoints:

| Service | Endpoint | Description |
|---------|----------|-------------|
| API | `/v1/health` | Checks Postgres + Redis connectivity |
| Web | `/` | Basic HTTP check |
| AI | `/health` | Basic HTTP check |

## Monitoring

### Sentry Setup

1. Create a Sentry project for each service
2. Add the DSN to environment variables
3. Enable error tracking in GitHub Actions (optional)

### Logs

View logs in Render Dashboard:
- Navigate to the service
- Click **Logs** tab
- Use filters for specific log levels

## Troubleshooting

### Common Issues

#### Database Connection Failed
- Verify `DATABASE_URL` is correctly set
- Check that the managed Postgres is running
- Ensure IP allowlist includes Render's outbound IPs

#### AI Service Not Responding
- Check `AI_SERVICE_URL` points to the correct service
- Verify the service is healthy at `/health`

#### Build Failures
- Check build logs for specific errors
- Ensure all required environment variables are set
- Verify Node.js version (20.x required)

### Rollback

To rollback to a previous deployment:

1. Go to the service in Render Dashboard
2. Click **Deploys**
3. Find the working deployment
4. Click **Redeploy**

## CI/CD Pipeline

The project uses GitHub Actions for CI/CD:

- **PRs**: Runs linting, tests, and Docker build
- **Staging push**: Auto-deploys to staging
- **Main push**: Runs full CI, then deploys to production

## Security Checklist

- [ ] All secrets are in Render environment variables, not in code
- [ ] Keycloak is properly configured with correct redirect URIs
- [ ] PayFast is in sandbox mode for staging
- [ ] Sentry is configured for error tracking
- [ ] Database has regular backups enabled (Render Starter+)
- [ ] Redis has persistence enabled

## Support

For issues or questions:
1. Check the [project documentation](./README.md)
2. Review [gap analysis documents](./docs/)
3. Contact the development team
