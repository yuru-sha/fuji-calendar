# Diamond Fuji & Pearl Fuji Calendar - Monorepo Edition
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yuru-sha/fuji-calendar)

**Version 0.3.0** - High-performance monorepo architecture

A web application for calculating and displaying optimal shooting times and locations for Diamond Fuji and Pearl Fuji phenomena. Built with modern monorepo architecture and powered by high-precision astronomical calculations using Astronomy Engine, designed to help photography enthusiasts efficiently plan their shoots.

## ✨ Key Features

- 📅 **Monthly Calendar View**: Visual display of Diamond/Pearl Fuji occurrence dates
- 🏔️ **Shooting Location Database**: Detailed information and access routes for nationwide photography spots
- ⭐ **High-precision Calculations**: Accurate astronomical position calculations using Astronomy Engine
- 🗺️ **Interactive Maps**: Location relationship display using Leaflet with route planning
- 🚗 **Route Navigation**: Optimal route guidance from current location via Google Maps
- ⭐ **Favorites System**: Save, manage, and export shooting locations and events
- 🌤️ **Weather Integration**: 7-day forecast with shooting condition recommendations
- 📊 **Shooting Quality Rating**: Evaluation based on astronomical calculations
- 🔐 **Admin Panel**: Location management system with JWT authentication
- 🕐 **JST Time Support**: Accurate time display in Japan Standard Time
- 🚀 **High Performance**: Optimized with Pino structured logging and Redis cache
- 🏗️ **Monorepo Architecture**: Efficient development with type-safe shared packages
- ⚡ **Async Processing**: Background astronomical calculations with BullMQ

## 🆕 Version 0.3.0 Major Improvements

### Architecture Overhaul
- **Monorepo Migration**: Efficient package management with npm workspaces
- **PostgreSQL + Prisma**: Migration from SQLite to PostgreSQL for production readiness
- **Redis + BullMQ**: High-performance queue system for async processing
- **Dependency Injection**: Improved maintainability with DIContainer
- **Strict Type Safety**: TypeScript strict mode across all packages

### Significant Performance Gains
- **Structured Logging**: 5-10x log performance improvement with Pino
- **Async Calculations**: Heavy astronomical computations moved to background
- **Optimized Caching**: High-speed data access with Redis
- **Efficient Build**: Fast frontend development with Vite

### Enhanced Developer Experience
- **Code Organization**: Script files organized into scripts/ directory structure
- **Type-safe Development**: Consistent type definitions via shared packages
- **Unified Quality Control**: Lint and typecheck across entire monorepo
- **Development Efficiency**: Comprehensive debugging script suite

## 🏗️ Tech Stack

### Architecture
- **Monorepo Structure**: Efficient package management with npm workspaces
- **Type-safe Development**: TypeScript strict mode across frontend, backend, and shared packages

### Frontend (@fuji-calendar/client)
- React 18 + TypeScript (strict mode)
- Tailwind CSS v3.4.17 (utility-first styling)
- CSS Modules (component-specific styles)
- Leaflet (map display & route drawing)
- Vite (fast build tool)
- LocalStorage API (favorites functionality)

### Backend (@fuji-calendar/server)
- Node.js + Express + TypeScript (strict mode)
- PostgreSQL 15 + Prisma ORM (database)
- Redis + BullMQ (cache & async queue system)
- Astronomy Engine (high-precision astronomical calculations)
- Pino (structured logging with 5-10x performance boost)
- bcrypt (password hashing)
- JWT (Access + Refresh Token authentication)

### Shared Packages
- **@fuji-calendar/types**: Common type definitions & interfaces
- **@fuji-calendar/utils**: Time processing, logging, formatters
- **@fuji-calendar/ui**: Reusable React components
- **@fuji-calendar/shared**: Common business logic

### Security & Infrastructure
- Helmet (security headers)
- Rate limiting (100req/min public, 60req/min admin, 5req/15min auth)
- CSRF protection
- XSS prevention
- SQL injection protection
- Brute force attack prevention
- Docker & Docker Compose
- nginx (reverse proxy)

## 📁 Project Structure (Monorepo)

```
fuji-calendar/
├── apps/                        # Applications
│   ├── client/                  # @fuji-calendar/client
│   │   ├── src/
│   │   │   ├── components/      # React components
│   │   │   ├── pages/           # Page components
│   │   │   ├── hooks/           # Custom hooks
│   │   │   ├── services/        # API & favorites services
│   │   │   ├── features/        # Feature-based components
│   │   │   └── App.tsx
│   │   ├── public/              # Static files
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── server/                  # @fuji-calendar/server
│       ├── src/
│       │   ├── controllers/     # API controllers
│       │   ├── repositories/    # Data access layer (Prisma)
│       │   ├── services/        # Business logic & astronomical calculations
│       │   ├── middleware/      # Express middleware
│       │   ├── database/        # Prisma configuration
│       │   ├── di/              # Dependency injection container
│       │   ├── routes/          # API route definitions
│       │   └── worker.ts        # Background worker
│       └── package.json
├── packages/                    # Shared packages
│   ├── types/                   # @fuji-calendar/types
│   │   └── src/                 # Common type definitions & interfaces
│   ├── utils/                   # @fuji-calendar/utils  
│   │   └── src/                 # Time processing, logging, formatters
│   ├── ui/                      # @fuji-calendar/ui
│   │   └── src/                 # Reusable React components
│   └── shared/                  # @fuji-calendar/shared
│       └── src/                 # Common business logic
├── scripts/                     # Management & development scripts
│   ├── admin/                   # Admin creation scripts
│   ├── debug/                   # Debug & verification scripts
│   ├── data-generation/         # Data generation scripts
│   └── config/                  # Docker management scripts
├── prisma/                      # Prisma schema & migrations
├── docker/                      # Docker configurations
├── nginx/                       # nginx configurations
├── tests/                       # Test files
├── docs/                        # Project documentation
├── package.json                 # Monorepo root configuration
└── tsconfig.json                # Common TypeScript configuration
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose v2 **Recommended**
- Node.js 18+ (for initial setup only)

### Docker Setup (Recommended)

```bash
# 1. Clone & Setup
git clone <repository-url>
cd fuji-calendar
cp .env.example .env

# 2. Database Migration
docker-compose -f docker-compose.dev.yml up postgres -d
sleep 15
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" npx prisma migrate deploy

# 3. Initial Setup
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" node scripts/admin/create-admin.js

# 4. Start Application
docker-compose -f docker-compose.dev.yml up -d
```

### Access
- **Frontend**: http://localhost:3000
- **Admin Login**: admin / admin123

## 💻 Development (Monorepo Environment)

### Development Server

```bash
# Start frontend, backend, and worker simultaneously
npm run dev

# Individual startup
npm run dev:client    # Frontend only (port 3001)
npm run dev:server    # Backend only (port 3000)
npm run dev:worker    # Background worker only
```

### Build & Quality Management

```bash
# Build all packages
npm run build

# Individual builds
npm run build:client    # Frontend build
npm run build:server    # Backend build  
npm run build:packages  # Shared packages build

# Quality checks
npm run typecheck       # TypeScript type checking (all packages)
npm run lint           # ESLint (all packages)
npm run lint:fix       # ESLint auto-fix

# Package management
npm run clean          # Clean build artifacts and node_modules
```

### Package Dependency Management

```bash
# Add to specific application
npm install <package> --workspace=apps/client
npm install <package> --workspace=apps/server

# Add to shared packages  
npm install <package> --workspace=packages/types
npm install <package> --workspace=packages/utils
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## 🛠️ Local Development (Without Docker)

### Installation Steps

1. Clone repository
```bash
git clone <repository-url>
cd fuji-calendar
```

2. Start Redis
```bash
# With Docker
docker run -d --name redis-fuji -p 6379:6379 redis:7-alpine

# Or local installation
redis-server
```

3. Install dependencies
```bash
npm install
```

4. Set environment variables (optional)
```bash
cp .env.example .env
# Edit .env file with necessary environment variables
```

5. Initialize database
```bash
npm run build:server
npm run start
# Database and sample data will be automatically created on first startup
```

## 🗂️ Available Scripts

### Root Level
- `npm run dev` - Start development servers (frontend + backend + worker)
- `npm run build` - Build all packages
- `npm run typecheck` - Type checking across all packages
- `npm run lint` - Lint all packages
- `npm run clean` - Clean build artifacts

### Application Specific
- `npm run dev:client` - Frontend development server
- `npm run dev:server` - Backend development server
- `npm run dev:worker` - Background worker
- `npm run build:client` - Frontend build
- `npm run build:server` - Backend build

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `NODE_ENV` | Environment mode | development |
| `DATABASE_URL` | PostgreSQL connection URL | postgresql://user:pass@localhost:5432/fuji_calendar |
| `JWT_SECRET` | JWT signing secret ⚠️ **Change for production** | Default value |
| `REFRESH_SECRET` | Refresh token secret ⚠️ **Change for production** | Default value |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `FRONTEND_URL` | Frontend URL (production) | - |
| `LOG_LEVEL` | Log level | info (prod), debug (dev) |
| `ENABLE_FILE_LOGGING` | Enable file logging | false |
| `LOG_DIR` | Log directory path | ./logs |

## 📚 API Endpoints

### Calendar API
- `GET /api/calendar/:year/:month` - Monthly calendar data
- `GET /api/events/:date` - Event details for specific date
- `GET /api/events/upcoming` - Upcoming events
- `GET /api/calendar/:year/:month/best` - Recommended shooting dates
- `POST /api/calendar/suggest` - Shooting plan suggestions

### Location API
- `GET /api/locations` - Location list
- `GET /api/locations/:id` - Location details
- `GET /api/locations/:id/yearly/:year` - Annual events for specific location

### Admin API
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/admin/locations` - Create location
- `PUT /api/admin/locations/:id` - Update location
- `DELETE /api/admin/locations/:id` - Delete location

### System API
- `GET /api/health` - Health check
- Weather forecast data integration (mock implementation)

## 🏗️ Monorepo Benefits

1. **Code Sharing**: Efficient sharing of type definitions, utilities, and UI components
2. **Consistency**: Unified toolchain and configuration
3. **Development Efficiency**: Integrated development in a single repository
4. **Dependency Management**: Efficient dependency management with workspace features

### Package Configuration

- **@fuji-calendar/types**: Common type definitions and interfaces
- **@fuji-calendar/utils**: Time processing, logging, formatters, and other utilities
- **@fuji-calendar/ui**: Reusable React components
- **@fuji-calendar/client**: React frontend application
- **@fuji-calendar/server**: Express.js backend application

## 📝 Development Guidelines

1. **Type Safety**: Leverage TypeScript for type-safe development
2. **Component Design**: Create reusable UI components
3. **Performance**: Efficient bundle size and runtime performance
4. **Maintainability**: Clear separation of concerns and modularization

## 🤝 Contributing

1. Create a feature branch
2. Implement changes
3. Run tests and linting
4. Create a pull request

## 📄 License

MIT License

## 🙏 Acknowledgments

- Astronomy Engine for precise astronomical calculations
- Contributors to the shooting location database
- Photography community for valuable feedback and suggestions