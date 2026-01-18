#!/bin/bash
# ==================================================================================
# LOCAL ENVIRONMENT SETUP
# ==================================================================================
# Automatically switches all services to Local configuration
# Usage: ./switch-to-local.sh
# ==================================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================"
echo "💻 Switching to Local Development"
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
    if [ -f "services/$service/.env.local" ]; then
        cp "services/$service/.env.local" "services/$service/.env"
        echo -e "${GREEN}✓${NC} $service -> .env.local"
    else
        echo -e "⚠️  services/$service/.env.local not found, skipping..."
    fi
done

echo ""
echo "========================================"
echo -e "${GREEN}✅ All services configured for LOCAL${NC}"
echo "========================================"
echo ""
echo "Services will use:"
echo "  • DB_HOST=localhost"
echo "  • Local URLs (e.g., http://localhost:4002)"
echo ""
echo "Next steps:"
echo "  1. Start PostgreSQL on localhost:5432"
echo "  2. cd services/[service-name] && yarn dev"
echo "========================================"
