# 🏓 ft_transcendence

A real-time multiplayer Pong game with tournament support, built with modern web technologies.

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)

## ✨ Features

### 🎮 Game Features
- **Real-time multiplayer Pong** with WebSocket communication
- **Single-player mode** (local 2-player on same keyboard)
- **Tournament system** with bracket management
- **Matchmaking queue** for finding opponents
- **Game history** and statistics tracking

### 👤 User Features
- **User authentication** with JWT tokens
- **Two-Factor Authentication (2FA)** via email
- **Google OAuth** integration
- **Custom avatars** with automatic generation
- **Friend system** with online status
- **User profiles** with game statistics

### 🔐 Security
- Password hashing with bcrypt
- JWT token management with blacklist
- Secure HTTPS via nginx
- Foreign key constraints in database
- Input validation and sanitization

## 🛠 Tech Stack

### Backend
- **TypeScript** - Type-safe JavaScript
- **Fastify** - Fast and low overhead web framework
- **SQLite** - Lightweight SQL database
- **WebSocket** - Real-time bidirectional communication
- **TAP** - Testing framework

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Styled Components** - CSS-in-JS
- **React Router** - Client-side routing
- **Axios** - HTTP client

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and HTTPS termination

## 📦 Prerequisites

- **Docker Desktop** or **OrbStack** (recommended for Mac)
- **Make** (for convenience commands)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/pmarkaide/42_transcendence.git
   cd 42_transcendence
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   make up
   ```

4. **Access the application**
   - **Frontend**: https://localhost:8443
   - **API Documentation**: https://localhost:8443/api/documentation

5. **Stop the application**
   ```bash
   make stop
   ```

## 💻 Development

### Available Make Commands

```bash
make up              # Build and start all services
make start           # Start services (without rebuild)
make build           # Build/rebuild services
make stop            # Stop all services
make logs            # View all logs
make backend-logs    # View backend logs only
make frontend-logs   # View frontend logs only
make nginx-logs      # View nginx logs only
make db              # Access SQLite database CLI
make test            # Run backend tests
make clean           # Remove containers and volumes
make fclean          # Full cleanup including images
```

### Local Development (without Docker)

#### Backend
```bash
cd backend
npm install
npm run dev          # Development with hot reload
npm run build        # Build TypeScript to JavaScript
npm run typecheck    # Type-check without building
```

#### Frontend
```bash
cd frontend
npm install
npm run dev          # Development with Vite
npm run build        # Production build
npm run lint         # Lint code
```

### TypeScript Development

The entire backend is written in TypeScript with strict type checking:
- All code is in `.ts` files
- Comprehensive type definitions in `backend/types.ts`
- Strict mode enabled in `tsconfig.json`
- Development uses `tsx` for instant TypeScript execution
- Production builds compile to JavaScript in `dist/`

## 🧪 Testing

The backend includes comprehensive unit tests using the TAP framework.

### Running Tests

```bash
# Run all tests
make test

# Or with Docker Compose directly
docker-compose run --rm backend npm test

# Show full coverage report
docker-compose run --rm backend npm test -- --show-full-coverage

# Allow incomplete coverage (useful for CI)
docker-compose run --rm backend npm test -- --allow-incomplete-coverage
```

### Test Files
All test files are in `backend/test/` and written in TypeScript:
- `users.test.ts` - User authentication, CRUD, avatars, 2FA
- `game.test.ts` - Game creation and multiplayer/singleplayer
- `tournaments.test.ts` - Tournament management
- `google.test.ts` - OAuth integration
- And more...

## 📁 Project Structure

```
ft_transcendence/
├── backend/              # TypeScript backend (Fastify)
│   ├── handlers/        # Request handlers with business logic
│   ├── routes/          # API route definitions
│   ├── game/            # Game engine and server logic
│   ├── test/            # Unit tests (TAP)
│   ├── types.ts         # TypeScript type definitions
│   ├── server.ts        # Main server entry point
│   ├── db.ts            # Database connection
│   ├── cron.ts          # Scheduled tasks
│   └── tsconfig.json    # TypeScript configuration
├── frontend/             # React + TypeScript frontend
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page components
│       ├── utils/       # Utility functions
│       └── App.tsx      # Main app component
├── Game/                 # Standalone game renderer
│   ├── game.ts          # Game initialization
│   └── render.ts        # Canvas rendering
├── SQLite/              # Database initialization
│   ├── init.sql         # Database schema
│   └── Dockerfile       # SQLite container
├── nginx/               # Reverse proxy configuration
│   ├── nginx.conf       # Nginx configuration
│   ├── ssl/             # SSL certificates
│   └── Dockerfile       # Nginx container
├── scripts/             # Utility scripts
├── docker-compose.yml   # Docker services definition
├── Makefile            # Convenience commands
└── README.md           # This file
```

## 📚 API Documentation

Once the application is running, visit the interactive API documentation:

**Swagger UI**: https://localhost:8443/api/documentation

### Main Endpoints

#### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login and get JWT token
- `POST /api/logout` - Logout and blacklist token
- `POST /api/verify_2fa_code` - Verify 2FA code

#### Users
- `GET /api/users` - Get all users
- `GET /api/user/:username` - Get user profile
- `GET /api/user/me` - Get current user
- `PUT /api/user/:username/update` - Update user
- `PUT /api/user/:username/upload_avatar` - Upload avatar
- `DELETE /api/user/:username/remove_avatar` - Remove avatar

#### Friends
- `POST /api/user/add_friend` - Add friend
- `GET /api/user/:username/friends` - Get user's friends
- `DELETE /api/user/remove_friend/:friendshipId` - Remove friend

#### Games
- `POST /api/game/create/multi` - Create multiplayer game
- `POST /api/game/create/single` - Create singleplayer game
- `GET /api/games` - List all games
- `GET /api/user/:username/matches` - Get user's match history
- `GET /api/user/:username/stats` - Get user statistics

#### Tournaments
- `POST /api/tournament/create` - Create tournament
- `GET /api/tournaments` - List tournaments
- `POST /api/tournament/:id/join` - Join tournament
- `POST /api/tournament/:id/start` - Start tournament

#### Matchmaking
- `POST /api/matchmaking` - Join matchmaking queue

#### OAuth
- `GET /api/oauth2/google/callback` - Google OAuth callback

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
SQLITE_DB_PATH=/data/test.sqlite

# JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-here

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://localhost:8443/api/oauth2/google/callback

# 2FA Email (optional)
TWOFA_GMAIL_USER=your-email@gmail.com
TWOFA_GMAIL_PASSWORD=your-app-specific-password

# Environment
NODE_ENV=dev
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `https://localhost:8443/api/oauth2/google/callback`

### Setting Up 2FA Email

1. Use a Gmail account
2. Enable 2-factor authentication on your Google account
3. Generate an [App Password](https://myaccount.google.com/apppasswords)
4. Use the app password in `TWOFA_GMAIL_PASSWORD`

## 🎮 Game Controls

### Multiplayer Mode
- **Arrow Up**: Move paddle up
- **Arrow Down**: Move paddle down

### Singleplayer Mode (Local 2-Player)
- **Player 1 (Left)**:
  - `W` - Move up
  - `S` - Move down
- **Player 2 (Right)**:
  - `Arrow Up` - Move up
  - `Arrow Down` - Move down

## 🐛 Troubleshooting

### Port Already in Use
If port 8443 is already in use:
```bash
# Check what's using the port
lsof -i :8443

# Kill the process or change the port in docker-compose.yml
```

### Database Issues
```bash
# Reset the database
make clean
make up
```

### TypeScript Build Errors
```bash
# Type-check the code
cd backend
npm run typecheck

# Rebuild node_modules
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues
```bash
# Full cleanup and rebuild
make fclean
make up
```

## 📝 License

This project is part of the 42 School curriculum.

## 🙏 Acknowledgments

Built with ❤️ as part of the 42 School ft_transcendence project.

---

**Note**: This is a learning project and should not be used in production without proper security hardening.
