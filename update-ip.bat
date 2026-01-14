@echo off
REM ============================================================================
REM Script: Update IP Address in all .env files
REM Usage: update-ip.bat [NEW_IP]
REM Example: update-ip.bat 192.168.1.10
REM ============================================================================

setlocal enabledelayedexpansion

REM Get current IP if not provided
if "%~1"=="" (
    echo No IP provided. Detecting current IP...
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
        set "IP=%%a"
        set "IP=!IP:~1!"
        goto :found
    )
    :found
    if "!IP!"=="" (
        echo ERROR: Could not detect IP address
        echo Usage: update-ip.bat [IP_ADDRESS]
        exit /b 1
    )
    echo Detected IP: !IP!
) else (
    set "IP=%~1"
    echo Using provided IP: !IP!
)

echo.
echo ============================================================================
echo Updating all .env files with IP: !IP!
echo ============================================================================
echo.

REM Update root .env
echo [1/3] Updating root .env...
powershell -Command "(Get-Content '.env') -replace 'http://[0-9.]+:', 'http://!IP!:' | Set-Content '.env'"
echo       Done.

REM Update QLNS_App .env
echo [2/3] Updating QLNS_App/.env...
powershell -Command "(Get-Content 'QLNS_App\.env') -replace 'http://[0-9.]+:', 'http://!IP!:' | Set-Content 'QLNS_App\.env'"
echo       Done.

REM Update app-face-recognition .env
echo [3/3] Updating services/app-face-recognition/.env...
powershell -Command "(Get-Content 'services\app-face-recognition\.env') -replace 'http://[0-9.]+:', 'http://!IP!:' | Set-Content 'services\app-face-recognition\.env'"
echo       Done.

echo.
echo ============================================================================
echo SUCCESS! All .env files updated with IP: !IP!
echo ============================================================================
echo.
echo Next steps:
echo   - Restart Docker: docker-compose restart
echo   - Restart mobile apps: npm start
echo.

endlocal
