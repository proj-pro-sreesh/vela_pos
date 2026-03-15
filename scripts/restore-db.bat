@echo off
chcp 65001 >nul
title Vela POS - Database Restore

echo ========================================
echo     Restoring Vela POS Database
echo ========================================
echo.

:: Get the project root directory
set "PROJECT_ROOT=%~dp0.."

:: Run the restore script from server directory (to find mongoose)
cd /d "%PROJECT_ROOT%\server"
node "%PROJECT_ROOT%\scripts\restore-db.js"

pause
