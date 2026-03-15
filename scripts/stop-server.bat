@echo off
chcp 65001 >nul
title Stop Vela POS System

:: This script stops all Node.js and MongoDB processes
echo ========================================
echo       Stopping Vela POS System
echo ========================================
echo.

:: Kill Node.js processes
echo Stopping Node.js server and client...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo No Node.js processes found.
) else (
    echo Node.js processes stopped.
)

:: Kill MongoDB process
echo Stopping MongoDB...
taskkill /F /IM mongod.exe >nul 2>&1
if %errorlevel% neq 0 (
    echo MongoDB process not found.
) else (
    echo MongoDB stopped.
)

echo.
echo ========================================
echo All processes stopped.
echo ========================================
echo.
pause
