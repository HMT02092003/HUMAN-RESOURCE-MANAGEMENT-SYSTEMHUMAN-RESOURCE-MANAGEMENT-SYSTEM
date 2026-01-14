@echo off
REM ==============================================================================
REM Environment Switcher Script (Windows)
REM ==============================================================================
REM Switches between Docker and Local database configurations
REM Usage:
REM   switch-env.bat docker    - Use Docker PostgreSQL (port 5433)
REM   switch-env.bat local     - Use Local PostgreSQL (port 5432)
REM ==============================================================================

setlocal enabledelayedexpansion

set SERVICES=auth-service employee-service attendance-service salary-service application-service job-service notification-service

if "%1"=="" (
    echo [ERROR] No environment specified!
    echo.
    echo Usage:
    echo   switch-env.bat docker    - Use Docker PostgreSQL
    echo   switch-env.bat local     - Use Local PostgreSQL
    exit /b 1
)

set MODE=%1

if not "%MODE%"=="docker" if not "%MODE%"=="local" (
    echo [ERROR] Invalid mode: %MODE%
    echo.
    echo Valid modes:
    echo   docker - Use Docker PostgreSQL (port 5433^)
    echo   local  - Use Local PostgreSQL (port 5432^)
    exit /b 1
)

echo ==============================================================================
echo   Environment Switcher
echo ==============================================================================
echo.

if "%MODE%"=="docker" (
    echo [INFO] Switching to DOCKER environment...
    echo    Database: postgres:5432 (Docker internal^)
    echo    Host Port: 5433
) else (
    echo [INFO] Switching to LOCAL environment...
    echo    Database: localhost:5432
)
echo.

echo [INFO] Updating service configurations...
echo.

for %%s in (%SERVICES%) do (
    if exist "services\%%s\.env.%MODE%" (
        copy /Y "services\%%s\.env.%MODE%" "services\%%s\.env" >nul
        echo [SUCCESS] %%s -^> .env.%MODE%
    ) else (
        echo [WARNING] services\%%s\.env.%MODE% not found, skipping...
    )
)

echo.
echo ==============================================================================

if "%MODE%"=="docker" (
    echo [SUCCESS] Switched to DOCKER environment!
    echo.
    echo Next steps:
    echo   1. Rebuild Docker containers: rebuild-docker.bat
    echo   2. Or manually: docker-compose down ^&^& docker-compose up --build -d
) else (
    echo [SUCCESS] Switched to LOCAL environment!
    echo.
    echo Next steps:
    echo   1. Make sure local PostgreSQL is running on port 5432
    echo   2. Start services: cd services\[service-name] ^&^& yarn dev
)
echo ==============================================================================

endlocal
