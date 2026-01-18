#!/bin/bash
# ==================================================================================
# DOCKER ENVIRONMENT SETUP
# ==================================================================================
# Automatically switches all services to Docker configuration
# Usage: ./switch-to-docker.sh
# ==================================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "🐳 Switching to Docker Environment"
echo "========================================"
echo ""

# List of services
SERVICES=(
    "auth-service"
    "employee-service"
    "attendance-service"
    "application-service"
    "salary-service"
    "job-service"
    "notification-service"
)

echo "📝 Copying environment configurations..."
echo ""

for service in "${SERVICES[@]}"; do
    if [ -f "services/$service/.env.docker" ]; then
        cp "services/$service/.env.docker" "services/$service/.env"
        echo -e "${GREEN}✓${NC} $service -> .env.docker"
    else
        echo -e "⚠️  services/$service/.env.docker not found, skipping..."
    fi
done

echo ""
echo "========================================"
echo -e "${GREEN}✅ All services configured for DOCKER${NC}"
echo "========================================"
echo ""
echo "Services will use:"
echo "  • DB_HOST=postgres (Docker internal)"
echo "  • Service names (e.g., http://employee-service:4002)"
echo ""
echo "Next steps:"
echo "  1. docker-compose down"
echo "  2. docker-compose up -d --build"
echo "========================================"
