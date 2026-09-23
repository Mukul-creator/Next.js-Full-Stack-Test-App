# Next.js Full-Stack Server & External API Test Application

A full-stack Next.js application designed to test hosting, internal backend API routes, third-party external API integration with authentication tokens, environment variables, and cookie authentication on any server.

---

## Features

- **Frontend**: Clean, responsive UI with real-time authentication status, environment variable isolation viewer, and an interactive API testing console.
- **Backend (Route Handlers)**: Native App Router API routes:
  - `GET /api/health`: Public system health check with uptime, timestamp, and environment checks.
  - `POST /api/auth/login`: Validates credentials and sets an `HttpOnly` session cookie with signed JWT.
  - `POST /api/auth/logout`: Clears the session cookie.
  - `GET /api/auth/me`: Returns the currently authenticated user from the session cookie.
  - `GET /api/data`: Protected route demonstrating server-side secret access and requiring an active session.
  - `GET /api/external`: Server-side proxy to **externally hosted APIs** using secure server tokens:
    - **NASA Open Data Astronomy API** (`/api/external?source=nasa`) using free public token `EXTERNAL_API_KEY="DEMO_KEY"`.
    - **GitHub Open-Source REST API** (`/api/external?source=github`) querying repo stats with optional Bearer token `GITHUB_TOKEN`.
- **Authentication**: Zero external dependencies. Self-contained JWT session token stored in an `HttpOnly`, `SameSite=Lax` cookie to protect against XSS.
- **Environment Variables**:
  - Server secrets (`SESSION_SECRET`, `SERVER_API_KEY`, `ADMIN_USER`, `ADMIN_PASSWORD`, `EXTERNAL_API_KEY`, `GITHUB_TOKEN`) are kept securely on the server.
  - Client variables (`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_ENV`) are bundled for the browser.
- **Production Ready**: Standard Next.js production build (`npm run build` & `npm run start`).

---

## Default Test Credentials & Tokens

| Field | Default Value | Configurable In |
|---|---|---|
| **Admin Username** | `admin` | `ADMIN_USER` in `.env.local` |
| **Admin Password** | `password123` | `ADMIN_PASSWORD` in `.env.local` |
| **NASA API Token** | `DEMO_KEY` (Official free working key) | `EXTERNAL_API_KEY` in `.env.local` |
| **GitHub Token** | Optional (Public access by default) | `GITHUB_TOKEN` in `.env.local` |

---

## Getting Started

### 1. Environment Variables Setup

Copy `.env.example` to `.env.local` (already done for you):
```bash
cp .env.example .env.local
```

### 2. Development Server

Run the development server locally:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Hosting on Your Server

### Option 1: Standard Node.js Server (Recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Build the application:**
   ```bash
   npm run build
   ```
3. **Start the production server:**
   ```bash
   npm run start
   ```
   By default, this listens on port `3000` (can be changed via `PORT=8080 npm run start`).

### Option 2: Running with PM2 (Process Manager)

For continuous background running and auto-restart on crashes or server reboots:
```bash
# Install PM2 globally if not installed
npm install -g pm2

# Build the app
npm run build

# Start with PM2
pm2 start npm --name "nextjs-fullstack" -- run start -- -p 3000

# Save process list for auto-boot
pm2 save
```

### Option 3: Reverse Proxy with Nginx

If you run Nginx on your server, forward requests to Next.js running on port 3000:
```nginx
server {
    listen 80;
    server_name your-domain-or-ip.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Project Structure

```
├── .env.example            # Environment variables template
├── .env.local              # Local/server active environment variables (with tokens)
├── next.config.mjs         # Next.js configuration
├── package.json            # Project dependencies and scripts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts  # Login & Set HttpOnly Cookie
│   │   │   │   ├── logout/route.ts # Logout & Clear Cookie
│   │   │   │   └── me/route.ts     # Current session info
│   │   │   ├── data/route.ts       # Protected API with server secret
│   │   │   ├── external/route.ts   # Externally hosted API with server token (NASA / GitHub)
│   │   │   └── health/route.ts     # Public health check
│   │   ├── globals.css     # Global styles & Tailwind
│   │   ├── layout.tsx      # Root HTML layout
│   │   └── page.tsx        # Interactive Full-Stack Dashboard
│   └── lib/
│       └── auth.ts         # JWT signing & cookie helpers
└── tsconfig.json           # TypeScript configuration
```
