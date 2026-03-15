@echo off
chcp 65001 >nul
title Vela POS System

:: MongoDB 6.0.14 is bundled in the project folder: mongodb-win32-x86_64-windows-6.0.14
:: To use a different MongoDB version, change the path below

echo ========================================
echo       Starting Vela POS System
echo ========================================
echo.

:: Get the project root directory
set "PROJECT_ROOT=%~dp0.."

:: Create data directories if they don't exist
if not exist "%PROJECT_ROOT%\data\db" mkdir "%PROJECT_ROOT%\data\db"
if not exist "%PROJECT_ROOT%\data\log" mkdir "%PROJECT_ROOT%\data\log"

:: Check if MongoDB is already running
echo Checking MongoDB status...
netstat -an | findstr ":27017" >nul
if %errorlevel% neq 0 (
    echo Starting MongoDB...
    start /B "MongoDB" cmd /k "cd /d "%PROJECT_ROOT%" && "C:\Users\user\Documents\Vela\mongodb-win32-x86_64-windows-6.0.14\bin\mongod.exe" --dbpath "C:\Users\user\Documents\Vela\data\db" --logpath "C:\Users\user\Documents\Vela\data\log\mongod.log" --bind_ip 127.0.0.1 --port 27017"
    echo Waiting for MongoDB to start...
    timeout /t 5 /nobreak >nul
) else (
    echo MongoDB is already running!
)
echo.

:: Install server dependencies
cd /d "%PROJECT_ROOT%\server"
echo Installing server dependencies...
call npm install 2>nul

:: Start server in new window (runs in background)
echo Starting backend server...
start "Vela POS Backend" cmd /k "cd /d "%PROJECT_ROOT%\server" && node server.js"

:: Wait for server to start
timeout /t 3 /nobreak >nul

:: Seed demo data to MongoDB
echo Seeding demo data to MongoDB...
cd /d "%PROJECT_ROOT%\server"
call node seeders/demo.js
echo.

:: Install client dependencies
cd /d "%PROJECT_ROOT%\client"
echo Installing client dependencies...
call npm install 2>nul

:: Start client in new window (runs in background)
echo Starting frontend...
start "Vela POS Frontend" cmd /k "cd /d "%PROJECT_ROOT%\client" && npm run dev"

echo.
echo ========================================
echo Servers are starting...
echo ========================================
echo.
echo MongoDB is running on port 27017 with data stored locally
echo.
echo Two new windows will open for the server and client.
echo Both windows must remain open while using the application.
echo.
pause
