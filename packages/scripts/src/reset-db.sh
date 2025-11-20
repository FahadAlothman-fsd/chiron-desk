#!/bin/bash
set -e

# Get the project root (assumes script is in packages/scripts/src/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../.."

echo "⚠️  WARNING: This will DELETE ALL DATA from the database."
echo -n "Continue? (y/N) "
read -r REPLY
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo "🔄 Stopping and removing Docker containers with volumes..."
cd "$PROJECT_ROOT/packages/db"
docker compose down -v 2>/dev/null || docker-compose down -v

echo "🚀 Starting fresh Docker containers..."
docker compose up -d 2>/dev/null || docker-compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "📊 Applying database schema..."
cd "$PROJECT_ROOT"
bun run db:push

echo "✅ Database reset complete!"
echo "💡 Run 'bun run db:seed' to populate with seed data (Story 1.2)"
