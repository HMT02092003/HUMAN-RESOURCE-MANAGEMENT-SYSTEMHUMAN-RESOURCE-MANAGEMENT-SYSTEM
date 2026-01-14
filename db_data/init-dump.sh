#!/bin/bash
# ==============================================================================
# PostgreSQL Database Initialization Script
# ==============================================================================
# Auto-creates 8 databases and restores data from dump files
# Supports: Regular databases + AI database with pgvector extension
# ==============================================================================

set -e

echo "=============================================================================="
echo "🚀 Starting Database Initialization"
echo "=============================================================================="
echo ""

# ------------------------------------------------------------------------------
# Function: Create and restore regular database
# ------------------------------------------------------------------------------
restore_normal_db() {
    local db_name=$1
    local file_name=$2
    
    echo "📦 Processing: $db_name"
    echo "   File: $file_name"
    
    # Create database
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE DATABASE "$db_name";
        GRANT ALL PRIVILEGES ON DATABASE "$db_name" TO "$POSTGRES_USER";
EOSQL
    
    echo "   ✅ Database created"
    
    # Check if dump file exists
    if [ -f "/docker-entrypoint-initdb.d/$file_name" ]; then
        # Restore data (ignore errors from ALTER on non-existent tables)
        psql --username "$POSTGRES_USER" --dbname "$db_name" \
            -f /docker-entrypoint-initdb.d/$file_name 2>&1 | grep -v "does not exist" || true
        echo "   ✅ Data restored (minor errors ignored)"
    else
        echo "   ⚠️  Warning: Dump file not found - empty database created"
    fi
    
    echo ""
}

# ------------------------------------------------------------------------------
# Function: Create and restore AI database (with pgvector extension)
# ------------------------------------------------------------------------------
restore_ai_db() {
    local db_name=$1
    local file_name=$2
    
    echo "🤖 Processing AI Database: $db_name"
    echo "   File: $file_name"
    
    # Create database
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE DATABASE "$db_name";
        GRANT ALL PRIVILEGES ON DATABASE "$db_name" TO "$POSTGRES_USER";
EOSQL
    
    echo "   ✅ Database created"
    
    # Enable pgvector extension (required for face embeddings)
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db_name" <<-EOSQL
        CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
    
    echo "   ✅ pgvector extension enabled"
    
    # Check if dump file exists
    if [ -f "/docker-entrypoint-initdb.d/$file_name" ]; then
        # Restore data (ignore errors from ALTER on non-existent tables)
        psql --username "$POSTGRES_USER" --dbname "$db_name" \
            -f /docker-entrypoint-initdb.d/$file_name 2>&1 | grep -v "does not exist" || true
        echo "   ✅ Data restored (minor errors ignored)"
    else
        echo "   ⚠️  Warning: Dump file not found - empty database created"
    fi
    
    echo ""
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

echo "🔍 Available dump files:"
ls -lh /docker-entrypoint-initdb.d/ | grep -v "init-dump.sh" | grep -v "total" || echo "   (No dump files found)"
echo ""

# ------------------------------------------------------------------------------
# Restore regular business databases
# ------------------------------------------------------------------------------
echo "📊 STEP 1: Creating Business Databases"
echo "------------------------------------------------------------------------------"

restore_normal_db "auth_service"         "auth_service"
restore_normal_db "employee_service"     "employee_service"
restore_normal_db "attendance_service"   "attendance_service"
restore_normal_db "salary_service"       "salary_service"
restore_normal_db "job_service"          "job_service"
restore_normal_db "application_service"  "application_service"
restore_normal_db "notification_service" "notification_service"

# ------------------------------------------------------------------------------
# Restore AI database (with vector support)
# ------------------------------------------------------------------------------
echo "🤖 STEP 2: Creating AI Database (with pgvector)"
echo "------------------------------------------------------------------------------"

# Database name: ai_face_recognition (updated from AI_service)
restore_ai_db "ai_face_recognition" "ai_face_service"

# ==============================================================================
# Verification
# ==============================================================================
echo "=============================================================================="
echo "✅ Database Initialization Complete!"
echo "=============================================================================="
echo ""
echo "📋 Database Summary:"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT datname as "Database Name", 
           pg_size_pretty(pg_database_size(datname)) as "Size"
    FROM pg_database 
    WHERE datname NOT IN ('postgres', 'template0', 'template1')
    ORDER BY datname;
EOSQL

echo ""
echo "🎉 All databases are ready!"
echo "=============================================================================="
