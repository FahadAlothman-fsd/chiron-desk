# Chiron AI Service

FastAPI service for BMAD workflow execution.

## Development

Start the development server:
```bash
npm run dev:ai-service
```

Or directly with UV:
```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /ready` - Readiness check

## Environment

Copy `.env.example` to `.env` and configure as needed.