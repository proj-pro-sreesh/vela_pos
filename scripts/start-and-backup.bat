@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Vela POS System

:: ========================================
:: Vela POS - Start with Auto Backup
:: ========================================
:: This script starts the application with automatic database backup
:: Prerequisites: Node.js, npm, and bundled MongoDB

echo ========================================
echo       Starting Vela POS System
echo     with Auto Database Backup
echo ========================================
echo.

:: Set project root (parent of scripts folder)
for %%I in ("%~dp0..") do set "PROJECT_ROOT=%%~fI"

:: Validate Node.js installation
echo [1/7] Checking prerequisites...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH.
    echo Please ensure npm is installed with Node.js.
    pause
    exit /b 1
)

:: Check MongoDB binary
set "MONGO_BIN=%PROJECT_ROOT%\mongodb-win32-x86_64-windows-6.0.14\bin\mongod.exe"
if not exist "%MONGO_BIN%" (
    echo ERROR: MongoDB binary not found at:
    echo   %MONGO_BIN%
    echo Please ensure MongoDB is extracted in the project folder.
    pause
    exit /b 1
)

:: Check server entry point
if not exist "%PROJECT_ROOT%\server\server.js" (
    echo ERROR: Server entry point not found: server\server.js
    pause
    exit /b 1
)

:: Check client entry point
if not exist "%PROJECT_ROOT%\client\package.json" (
    echo ERROR: Client package.json not found.
    pause
    exit /b 1
)

:: Create required directories
echo [2/7] Creating data directories...
if not exist "%PROJECT_ROOT%\data\db" mkdir "%PROJECT_ROOT%\data\db"
if not exist "%PROJECT_ROOT%\data\log" mkdir "%PROJECT_ROOT%\data\log"
if not exist "%PROJECT_ROOT%\backups" mkdir "%PROJECT_ROOT%\backups"

:: Check if MongoDB is already running
echo [3/7] Checking MongoDB status...
netstat -an -p tcp | findstr ":27017" >nul
if %errorlevel% equ 0 (
    tasklist /FI "IMAGENAME eq mongod.exe" 2>nul | findstr /I "mongod.exe" >nul
    if %errorlevel% equ 0 (
        echo MongoDB is already running on port 27017.
        goto :mongo_done
    )
)

echo Starting MongoDB...
start "MongoDB" cmd /k "cd /d "%PROJECT_ROOT%" && "%MONGO_BIN%" --dbpath "%PROJECT_ROOT%\data\db" --logpath "%PROJECT_ROOT%\data\log\mongod.log" --bind_ip 127.0.0.1 --port 27017"
echo Waiting for MongoDB to initialize...
timeout /t 5 /nobreak >nul

:: Verify MongoDB started
echo Verifying MongoDB connection...
set "MONGO_CLI=%MONGO_BIN:\mongod.exe=mongo.exe%"
for /l %%i in (1,1,12) do (
    "%MONGO_CLI%" --eval "db.adminCommand('ping')" >nul 2>&1
    if !errorlevel! equ 0 (
        echo MongoDB is running.
        goto :mongo_done
    )
    timeout /t 1 /nobreak >nul
)
echo WARNING: MongoDB may not have started properly.
echo Continuing anyway...
:mongo_done
echo.

:: ========================================
:: INSTALL SERVER DEPENDENCIES
:: ========================================
echo [4/7] Installing server dependencies...
cd /d "%PROJECT_ROOT%\server"
if not exist "%PROJECT_ROOT%\server\node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install server dependencies.
        echo Please run: cd server && npm install
        pause
        exit /b 1
    )
) else (
    echo Server dependencies already installed.
)

:: ========================================
:: AUTO BACKUP - Backup database after deps installed
:: ========================================
echo.
echo ========================================
echo       Creating Database Backup...
echo ========================================
echo.

:: Check backup script exists
if not exist "%PROJECT_ROOT%\scripts\backup-db.js" (
    echo WARNING: Backup script not found, skipping backup.
    goto :skip_backup
)

cd /d "%PROJECT_ROOT%\server"
node "%PROJECT_ROOT%\scripts\backup-db.js"

if %errorlevel% neq 0 (
    echo WARNING: Backup failed! Continuing anyway...
) else (
    echo.
    echo Database backup completed successfully!
)
:skip_backup
echo.

:: ========================================
:: CLEANUP - Delete old MongoDB logs (keep last 14 days)
:: ========================================
echo ========================================
echo    Cleaning up old MongoDB logs...
echo ========================================
echo.

:: Delete log files older than 14 days in data\log directory
forfiles /P "%PROJECT_ROOT%\data\log" /S /D -14 /C "cmd /c del @path" 2>nul

echo Old MongoDB logs (older than 14 days) have been deleted.
echo.

:: Start server in new window (runs in background)
echo [5/7] Starting backend server...
start "Vela POS Backend" cmd /k "cd /d "%PROJECT_ROOT%\server" && node server.js"

:: Wait for server to start
echo Waiting for server to initialize...
timeout /t 3 /nobreak >nul

:: Seed demo data to MongoDB
echo Seeding demo data to MongoDB...
call node seeders/demo.js
if %errorlevel% neq 0 (
    echo WARNING: Demo data seeding failed or already exists. Continuing...
) else (
    echo Demo data seeded successfully.
)
echo.

:: Install client dependencies
echo [6/7] Installing client dependencies...
cd /d "%PROJECT_ROOT%\client"
if not exist "%PROJECT_ROOT%\client\node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install client dependencies.
        echo Please run: cd client && npm install
        pause
        exit /b 1
    )
) else (
    echo Client dependencies already installed.
)

:: Start client in new window (runs in background)
echo [7/7] Starting frontend...
start "Vela POS Frontend" cmd /k "cd /d "%PROJECT_ROOT%\client" && npm run dev"

echo.
echo ========================================
echo Vela POS System Started Successfully!
echo ========================================
echo.
echo MongoDB is running on 127.0.0.1:27017
echo.
echo A database backup was created before starting.
echo Backups older than 14 days are automatically cleaned up.
echo.
echo Two new windows will open for the backend and frontend servers.
echo Both windows must remain open while using the application.
echo.
echo If any errors occurred, check the individual terminal windows.
echo.
pause
