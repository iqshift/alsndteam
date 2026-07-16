@echo off
title K2 Delivery Platform Servers
echo ===================================================
echo   K2 Delivery Platform - Server Startup Script
echo ===================================================
echo.

echo [+] Starting Redis Server (Port 6380)...
start "Redis Server (6380)" /D "%~dp0backend" cmd /c "redis-server.exe --port 6380"
timeout /t 2 /nobreak >nul

echo [+] Starting NestJS Backend Server...
start "NestJS Backend" /D "%~dp0backend" cmd /k "npm run start:dev"
timeout /t 3 /nobreak >nul

echo [+] Starting Admin Dashboard (Port 3001)...
start "Admin Dashboard" /D "%~dp0admin-dashboard" cmd /k "set PORT=3001&& set BROWSER=none&& npm start"

echo.
echo ===================================================
echo   All servers have been launched in separate windows!
echo ===================================================
echo.
pause
