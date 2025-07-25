# Fuji Calendar - Diamond Fuji & Pearl Fuji Photography Guide
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/yuru-sha/fuji-calendar)

**Version 0.1.0**

A calendar application that displays optimal dates and locations for Diamond Fuji and Pearl Fuji photography. Provides accurate information based on high-precision astronomical calculations using Astronomy Engine to help photography enthusiasts efficiently plan their shoots.

![Diamond Fuji](docs/images/diamond_fuji_small.png) ![Pearl Fuji](docs/images/pearl_fuji_small.png)

## Features

- 📅 **Monthly Calendar Display**: Visual representation of Diamond Fuji & Pearl Fuji occurrence dates
- 🏔️ **Photography Location Information**: Detailed information and access methods for shooting spots nationwide
- ⏰ **High-Precision Astronomical Calculations**: Precise celestial position calculations using Astronomy Engine
- 🗺️ **Map Display**: Leaflet-based visualization of photography locations and Mt. Fuji positioning
- 🚗 **Route Navigation**: Google Maps integration for optimal route planning from current location
- ⭐ **Favorites Feature**: Save, manage, and export photography locations & events
- 🌤️ **Weather Integration**: 7-day weather forecast with shooting condition recommendations
- 📊 **Photography Recommendation Score**: Evaluation of shooting conditions based on astronomical calculations
- 🔐 **Admin Management**: Administrator registration and management of photography locations
- 🕐 **JST Time Support**: Accurate time display in Japan Standard Time
- 🎯 **Precise Pearl Fuji Search**: Detailed search around moonrise/moonset times
- 🚀 **High Performance**: Optimization with Pino structured logging & Redis caching

## Technology Stack

### Frontend
- React 18
- TypeScript (strict mode)
- Tailwind CSS v3.4.17 (utility-first styling)
- CSS Modules (component-specific styles)
- Leaflet (Map display)
- LocalStorage API (Favorites feature)

### Backend
- Node.js
- Express
- TypeScript (strict mode)
- PostgreSQL 15 + Prisma ORM (Database)
- Redis (Cache & Queue system with BullMQ)
- Astronomy Engine (High-precision astronomical calculations)
- Pino (Structured logging with performance optimization)
- bcrypt (Password hashing)
- JWT (Authentication with refresh tokens)

### Security & Infrastructure
- Helmet (Security headers)
- Rate limiting (100req/min public, 60req/min admin, 5req/15min auth)
- CSRF protection
- XSS protection
- SQL injection prevention
- Brute force attack protection
- Docker & Docker Compose
- nginx (Reverse proxy)

## 🚀 Quick Start

**Get running in 5 minutes**: [QUICKSTART.md](QUICKSTART.md)

### Requirements
- Docker & Docker Compose v2 **Recommended**
- Node.js 18+ (for initial setup only)

## Installation & Setup

### Docker Environment (Recommended)

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
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" node scripts/admin/create-admin.js          # admin/admin123
DATABASE_URL="postgresql://fuji_user:dev_password_123@localhost:5432/fuji_calendar" node scripts/setup-initial-data.js          # Sample locations

# 4. Start Application
docker-compose -f docker-compose.dev.yml up -d
```

### Access
- **Frontend**: http://localhost:3000
- **Admin Login**: admin / admin123

### Production Environment

1. Set environment variables
```bash
cp .env.example .env
# Edit .env file with production values (JWT_SECRET, etc.)
```

2. Deploy production environment
```bash
# Production environment startup
docker-compose up -d

# Or use management script
bash scripts/config/docker-prod.sh deploy
```

3. Access
- Application: http://localhost

### Docker Management Commands

```bash
# Development environment
bash scripts/config/docker-dev.sh start      # Start development environment
bash scripts/config/docker-dev.sh stop       # Stop
bash scripts/config/docker-dev.sh logs       # View logs
bash scripts/config/docker-dev.sh status     # Check status
bash scripts/config/docker-dev.sh clean      # Cleanup

# Production environment
bash scripts/config/docker-prod.sh deploy    # Deploy
bash scripts/config/docker-prod.sh start     # Start
bash scripts/config/docker-prod.sh stop      # Stop
bash scripts/config/docker-prod.sh backup    # Database backup
bash scripts/config/docker-prod.sh health    # Health check
```

## Local Environment (Without Docker)

### Installation Steps

1. Clone the repository
```bash
git clone <repository-url>
cd fuji-calendar
```

2. Start Redis
```bash
# Start with Docker
docker run -d --name redis-fuji -p 6379:6379 redis:7-alpine

# OR local installation
redis-server
```

3. Install dependencies
```bash
npm install
```

4. Set environment variables (optional)
```bash
cp .env.example .env
# Edit .env file to set required environment variables
```

5. Initialize database
```bash
npm run build:server
npm run start
# Database and sample data will be automatically created on first startup
```

## Development

### Starting Development Server

Start both frontend and backend simultaneously:
```bash
npm run dev
```

Start individually:
```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev:client
```

### Build

```bash
# Production build
npm run build

# Type checking
npm run typecheck

# Lint
npm run lint
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Test watch mode
npm run test:watch
```

## API Endpoints

### Calendar API

- `GET /api/calendar/:year/:month` - Monthly calendar data
- `GET /api/events/:date` - Specific date event details
- `GET /api/events/upcoming` - Upcoming events
- `GET /api/calendar/:year/:month/best` - Recommended photography dates
- `POST /api/calendar/suggest` - Photography plan suggestions

### Photography Location API

- `GET /api/locations` - Photography location list
- `GET /api/locations/:id` - Photography location details
- `GET /api/locations/:id/yearly/:year` - Yearly events for specific location

### Admin API

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/admin/locations` - Create photography location
- `PUT /api/admin/locations/:id` - Update photography location
- `DELETE /api/admin/locations/:id` - Delete photography location

### System API

- `GET /api/health` - Health check
- Weather forecast data integration (mock implementation)

## Directory Structure

```
fuji-calendar/
├── src/
│   ├── client/          # Frontend code
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API & favorites services
│   │   ├── types/       # Type definitions
│   │   └── assets/      # Static resources
│   ├── server/          # Backend code
│   │   ├── controllers/ # API controllers
│   │   ├── models/      # Data models
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Express middleware
│   │   └── database/    # Database configuration
│   └── shared/          # Shared type definitions & utilities
│       ├── types/       # TypeScript type definitions
│       └── utils/       # Common utilities
├── tests/               # Test files
├── data/                # Database files
└── dist/                # Build output
```

## Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Runtime environment | development |
| `DATABASE_URL` | PostgreSQL connection URL | postgresql://user:pass@localhost:5432/fuji_calendar |
| `JWT_SECRET` | JWT signing secret ⚠️ **Change for production** | Default value |
| `REFRESH_SECRET` | Refresh token secret ⚠️ **Change for production** | Default value |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `FRONTEND_URL` | Frontend URL (for production) | - |
| `LOG_LEVEL` | Log level | info (prod), debug (dev) |
| `ENABLE_FILE_LOGGING` | File log output | false |
| `LOG_DIR` | Log directory path | ./logs |

## Features in Detail

### Diamond Fuji Photography
Diamond Fuji occurs when the sun appears to sit atop Mt. Fuji, creating a diamond-like effect. The application calculates precise times and locations where this phenomenon can be observed and photographed.

### Pearl Fuji Photography
Pearl Fuji occurs when the moon appears to sit atop Mt. Fuji. The application provides detailed calculations for moonrise/moonset times and optimal viewing locations.

### High-Precision Calculations
- Uses Astronomy Engine for accurate celestial mechanics
- Atmospheric refraction corrections
- Earth ellipsoid model considerations
- Automatic season detection for optimal viewing periods
- Azimuth precision within ±1.5 degrees
- 10-second interval calculation for optimal timing

### Weather Information System
- 7-day weather forecast integration (mock implementation)
- Shooting condition recommendations based on weather
- Visual weather icons and color-coded recommendations
- Integration with event detail displays

### Admin Management Features
- Location management with pagination and search
- JSON import/export for bulk operations
- Password change functionality
- Comprehensive location database with 28+ famous viewing spots
- JWT-based authentication with account lockout protection
- Brute force attack prevention

### UI/UX Improvements
- Responsive design with 1280px max-width layout
- Tailwind CSS integration for consistent styling
- Enhanced calendar visibility with better event icons
- Smooth animations and hover effects
- Accessible keyboard navigation
- Intuitive route navigation with 🗺️ icon integration
- One-click route planning to photography locations

## Contributing

Pull requests and issue reports are welcome.

## Support

For questions or issues, please feel free to ask on GitHub Issues.

## License

MIT License

## Acknowledgments

- Astronomy Engine for precise astronomical calculations
- Contributors to the photography location database
- The photography community for valuable feedback and suggestions