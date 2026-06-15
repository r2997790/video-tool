# Video Tool

Hosted webapp for configurable video demos with chapters, chat, AI responses, and a flow editor for intro/outro questions and branching.

## Features

- **Public demo** (`/demo`) — three-panel layout: chapters | video player | chat
- **Admin panel** (`/admin`) — configure toggles, chapters (with watch analytics), toasters, seed chat, live chat, and visual flow editor
- **Chapter pick toggle** — allow clicking chapters or play a random video
- **Pause toggle** — allow or block video pausing
- **View time tracking** — per-chapter watch time and viewer counts in admin
- **Toasters** — timed in-video popup messages at configurable trigger time and duration
- **Visual flow editor** — drag-and-connect canvas (React Flow) for intro/outro/branching

## Local Development

### Prerequisites

- .NET 8 SDK
- Node.js 18+

### Backend

```bash
cd video-tool/src/VideoTool.Web
dotnet run
```

Runs on `http://localhost:5000` (or port from launchSettings).

### Frontend (dev with API proxy)

```bash
cd video-tool/client
npm install
npm run dev
```

Runs on `http://localhost:5173` with `/api` and `/hubs` proxied to the backend.

### Production build

```bash
cd video-tool/client
npm run build
cd ../src/VideoTool.Web
dotnet run
```

The Vite build outputs to `src/VideoTool.Web/wwwroot`.

## Admin Login

Default credentials (seeded on first run):

- **Username:** `admin`
- **Password:** `admin123` (or value of `ADMIN_PASSWORD` env var)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (Railway sets automatically) |
| `DATABASE_URL` | PostgreSQL connection URL (Railway) |
| `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` | Alternative PostgreSQL config |
| `ADMIN_PASSWORD` | Initial admin password (default: `admin123`) |
| `OPENAI_API_KEY` | Optional — enables AI chat responses |
| `OPENAI_MODEL` | Optional — defaults to `gpt-4o-mini` |

Without `OPENAI_API_KEY`, AI chat uses canned fallback responses.

## Railway Deployment

1. Connect the `video-tool/` directory to Railway
2. Add PostgreSQL plugin (sets `DATABASE_URL`)
3. Set `ADMIN_PASSWORD` and optionally `OPENAI_API_KEY`
4. Deploy — Dockerfile builds frontend and backend

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/demo/config` | Public demo configuration |
| `POST /api/demo/chat` | Send chat message |
| `GET /api/admin/config` | Admin settings (auth required) |
| `PUT /api/admin/config` | Update settings |
| `CRUD /api/admin/chapters` | Manage chapters |
| `CRUD /api/admin/seed-messages` | Manage seed chat |
| `GET/PUT /api/admin/flow` | Flow editor project |
| `POST /api/auth/login` | Admin login |

## Project Structure

```
video-tool/
├── client/          # React + Vite frontend
├── src/
│   ├── VideoTool.Domain/
│   ├── VideoTool.Data/
│   └── VideoTool.Web/
├── Dockerfile
└── railway.json
```
