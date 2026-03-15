@echo off
chcp 65001 >nul

echo ========================================
echo       Vela POS - IP Detection
echo ========================================
echo.

echo Detecting your local IP address...

:: Get the local IP address
for /f "tokens=2 delims=[]" %%a in ('ping -4 -n 1 %ComputerName% ^| findstr /i "ping"') do set LOCAL_IP=%%a
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo Your local IP address is: %LOCAL_IP%
echo.
echo Use this IP to access Vela POS from other devices on your network.
echo   - Backend API: http://%LOCAL_IP%:5000
echo   - Frontend: http://%LOCAL_IP%:5173
echo.

pause
