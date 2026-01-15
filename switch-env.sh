#!/bin/bash

# ==============================================================================
# Environment Switcher Script
# ==============================================================================
# Switches between Docker and Local database configurations
# Usage:
#   ./switch-env.sh docker    - Use Docker PostgreSQL (port 5433)
#   ./switch-env.sh local     - Use Local PostgreSQL (port 5432)
# ==============================================================================

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Services list
SERVICES=(
    "auth-service"
    "employee-service"
    "attendance-service"
    "salary-service"
    "application-service"
    "job-service"
    "notification-service"
    "ai-face-recognition-service"
)

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to switch environment for a service
switch_service_env() {
    local service=$1
    local mode=$2
    local service_path="services/$service"
    
    if [ ! -d "$service_path" ]; then
        print_warning "Service not found: $service"
        return
    fi
    
    # Copy appropriate env file to .env
    if [ -f "$service_path/.env.$mode" ]; then
        cp "$service_path/.env.$mode" "$service_path/.env"
        print_success "$service -> .env.$mode"
    else
        print_warning "$service/.env.$mode not found, skipping..."
    fi
}

# Main script
echo "=============================================================================="
echo "  🔄 Environment Switcher"
echo "=============================================================================="
echo ""

# Check arguments
if [ $# -eq 0 ]; then
    print_error "No environment specified!"
    echo ""
    echo "Usage:"
    echo "  ./switch-env.sh docker    - Use Docker PostgreSQL"
    echo "  ./switch-env.sh local     - Use Local PostgreSQL"
    exit 1
fi

MODE=$1

# Validate mode
if [ "$MODE" != "docker" ] && [ "$MODE" != "local" ]; then
    print_error "Invalid mode: $MODE"
    echo ""
    echo "Valid modes:"
    echo "  docker - Use Docker PostgreSQL (port 5433)"
    echo "  local  - Use Local PostgreSQL (port 5432)"
    exit 1
fi

# Display current action
if [ "$MODE" = "docker" ]; then
    echo -e "${BLUE}📦 Switching to DOCKER environment...${NC}"
    echo "   Database: postgres:5432 (Docker internal)"
    echo "   Host Port: 5433"
else
    echo -e "${BLUE}💻 Switching to LOCAL environment...${NC}"
    echo "   Database: localhost:5432"
fi
echo ""

# Switch environment for all services
print_info "Updating service configurations..."
echo ""

for service in "${SERVICES[@]}"; do
    switch_service_env "$service" "$MODE"
done

echo ""
echo "=============================================================================="
if [ "$MODE" = "docker" ]; then
    print_success "✅ Switched to DOCKER environment!"
    echo ""
    echo "Next steps:"
    echo "  1. Rebuild Docker containers: ./rebuild-docker.sh"
    echo "  2. Or manually: docker-compose down && docker-compose up --build -d"
else
    print_success "✅ Switched to LOCAL environment!"
    echo ""
    echo "Next steps:"
    echo "  1. Make sure local PostgreSQL is running on port 5432"
    echo "  2. Start services: cd services/[service-name] && yarn dev"
fi
echo "=============================================================================="
