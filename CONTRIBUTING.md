# Contributing to Bellwether SWE E-Commerce

Thank you for your interest in contributing to the Bellwether SWE E-Commerce Platform!

## Getting Started

### Prerequisites

- Node.js 20.x or later
- Docker and Docker Compose (for local development)
- PostgreSQL 16 (if not using Docker)
- Redis 7 (if not using Docker)

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bellwether-swe-ecommerce.git
   cd bellwether-swe-ecommerce
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development environment:
   ```bash
   # Using Docker
   docker-compose up -d
   
   # Or manually
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   npm run dev:api &
   npm run dev:web
   ```

5. Set up the database:
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma migrate dev
   ```

## Project Structure

```
bellwether-swe-ecommerce/
├── apps/
│   ├── api/          # NestJS API (Port 3001)
│   ├── web/          # Next.js Storefront (Port 3000)
│   └── ai-service/   # FastAPI AI Service (Port 8000)
├── packages/
│   └── shared-types/ # Shared TypeScript types
├── docs/             # Documentation
└── scripts/          # Build/Dev scripts
```

## Development Workflow

### Branch Naming

- `feature/` - New features (e.g., `feature/user-reviews`)
- `fix/` - Bug fixes (e.g., `fix/cart-checkout-error`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)
- `docs/` - Documentation updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user review functionality
fix: resolve cart calculation error
docs: update API documentation
style: format code with prettier
refactor: extract shared utility functions
test: add unit tests for checkout flow
chore: update dependencies
```

### Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes following the code guidelines

3. Run tests:
   ```bash
   npm test
   npm run lint
   ```

4. Push and create a PR:
   ```bash
   git push origin feature/my-feature
   ```

5. Fill out the PR template with:
   - Description of changes
   - Related issue (if applicable)
   - Testing done
   - Screenshots (for UI changes)

## Code Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over type aliases
- Use explicit return types for exported functions
- Maximum 1,500 lines per file (enforced by CI)

### React/Next.js

- Use functional components with hooks
- Follow Next.js 14 App Router conventions
- Co-locate component files
- Use server components by default

### NestJS

- Follow the module pattern (controller → service → repository)
- Use DTOs with class-validator
- Maximum 800 lines per service file

### Testing

- Write tests for all new features
- Maintain minimum 80% coverage on critical paths
- Use meaningful test descriptions

## API Development

When adding new API endpoints:

1. Create DTOs in `modules/<module>/dto/`
2. Add validation decorators
3. Update the Prisma schema if needed
4. Add Swagger documentation
5. Write unit and e2e tests

## Frontend Development

When adding new pages:

1. Use the App Router pattern
2. Create server components by default
3. Use the design system components
4. Add loading and error boundaries
5. Write component tests

## Documentation

Update documentation when making significant changes:

- API changes → Update Swagger docs
- Schema changes → Update `docs/ARCHITECTURE.md`
- New features → Update `docs/FEATURES.md`
- Breaking changes → Document in PR description

## Environment Variables

Never commit secrets:

```bash
# Use .env.example as template
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Required variables for development:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `KEYCLOAK_*` - Authentication configuration
- `PAYFAST_*` - Payment gateway (use sandbox)

## Questions?

- Open an issue for bugs or feature requests
- Check existing documentation in `docs/`
- Review gap analysis documents for project status
