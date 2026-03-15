@echo off
chcp 65001 >nul
title Vela POS - Database Backup

echo ========================================
echo       Backing Up Vela POS Database
echo ========================================
echo.

:: Get the project root directory
set "PROJECT_ROOT=%~dp0.."

:: Run the backup script from server directory (to find mongoose)
cd /d "%PROJECT_ROOT%\server"
node "%PROJECT_ROOT%\scripts\backup-db.js"

pause
