# Fuji Calendar - Diamond Fuji & Pearl Fuji Photography Guide

**Version 0.1.0**

A calendar application that displays optimal dates and locations for Diamond Fuji and Pearl Fuji photography. Provides accurate information based on high-precision astronomical calculations using Astronomy Engine to help photography enthusiasts efficiently plan their shoots.

![Diamond Fuji](docs/images/diamond_fuji_small.png) ![Pearl Fuji](docs/images/pearl_fuji_small.png)

## Features

- 📅 **Monthly Calendar Display**: Visual representation of Diamond Fuji & Pearl Fuji occurrence dates
- 🏔️ **Photography Location Information**: Detailed information and access methods for shooting spots nationwide
- ⏰ **High-Precision Astronomical Calculations**: Precise celestial position calculations using Astronomy Engine
- 🗺️ **Map Display**: Leaflet-based visualization of photography locations and Mt. Fuji positioning
- ⭐ **Favorites Feature**: Save, manage, and export photography locations & events
- 📊 **Photography Recommendation Score**: Evaluation of shooting conditions based on astronomical calculations
- 🔐 **Admin Management**: Administrator registration and management of photography locations
- 🕐 **JST Time Support**: Accurate time display in Japan Standard Time
- 🎯 **Precise Pearl Fuji Search**: Detailed search around moonrise/moonset times
- 🚀 **High Performance**: Optimization with Pino structured logging & Redis caching

## Technology Stack

### Frontend
- React 18
- TypeScript
- Leaflet (Map display)
- CSS Modules
- LocalStorage API (Favorites feature)

### Backend
- Node.js
- Express
- TypeScript
- SQLite3 (Database)
- Redis (Cache & Queue system)
- Astronomy Engine (High-precision astronomical calculations)
- Pino (Structured logging)
- bcrypt (Password hashing)
- JWT (Authentication)

### Security & Infrastructure
- Helmet (Security headers)
- Rate limiting (100req/min public, 60req/min admin, 5req/15min auth)
- CSRF protection
- XSS protection
- SQL injection prevention
- Brute force attack protection
- Docker & Docker Compose
- nginx (Reverse proxy)

## Installation & Setup

### Requirements
- Docker & Docker Compose **Recommended**
- OR Node.js 18+ + Redis

## Docker Environment (Recommended)

### Development Environment

1. Clone the repository
```bash
git clone <repository-url>
cd fuji-calendar
```

2. Start development environment
```bash
./scripts/docker-dev.sh start
```

3. Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Production Environment

1. Set environment variables
```bash
cp .env.example .env
# Edit .env file with production values (JWT_SECRET, etc.)
```

2. Deploy production environment
```bash
./scripts/docker-prod.sh deploy
```

3. Access
- Application: http://localhost:8000

### Docker Management Commands

```bash
# Development environment
./scripts/docker-dev.sh start      # Start development environment
./scripts/docker-dev.sh stop       # Stop
./scripts/docker-dev.sh logs       # View logs
./scripts/docker-dev.sh status     # Check status
./scripts/docker-dev.sh clean      # Cleanup

# Production environment
./scripts/docker-prod.sh deploy    # Deploy
./scripts/docker-prod.sh start     # Start
./scripts/docker-prod.sh stop      # Stop
./scripts/docker-prod.sh backup    # Database backup
./scripts/docker-prod.sh health    # Health check
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

### Admin API

- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/admin/locations` - Create photography location
- `PUT /api/admin/locations/:id` - Update photography location
- `DELETE /api/admin/locations/:id` - Delete photography location

### System API

- `GET /api/health` - Health check

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
| `PORT` | Server port | 8000 |
| `NODE_ENV` | Runtime environment | development |
| `DB_PATH` | Database file path | ./data/fuji_calendar.db |
| `JWT_SECRET` | JWT signing secret ⚠️ **Change for production** | Default value |
| `REFRESH_SECRET` | Refresh token secret ⚠️ **Change for production** | Default value |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `FRONTEND_URL` | Frontend URL (for production) | - |
| `LOG_LEVEL` | Log level | info (prod), debug (dev) |
| `ENABLE_FILE_LOGGING` | File log output | false |

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

### Admin Management Features
- Location management with pagination and search
- JSON import/export for bulk operations
- Password change functionality
- Comprehensive location database with 28+ famous viewing spots

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