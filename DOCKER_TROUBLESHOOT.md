# Docker Desktop Troubleshooting Guide

## Common Fixes for "Docker Desktop is Unable to Start"

### 1. Enable Required Windows Features

Open **Windows PowerShell as Administrator** and run:

```powershell
# Enable WSL2
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Set WSL2 as default
wsl --set-default-version 2
```

Then restart your computer.

### 2. Check if Hyper-V is Enabled

```powershell
# Check Hyper-V status
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
```

If disabled, enable it:
```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All
```

### 3. Update WSL2 Kernel

Download and install: https://aka.ms/wsl2kernel

### 4. Restart Docker Desktop

1. Right-click the Docker icon in the system tray
2. Select "Quit Docker Desktop"
3. Wait 5 seconds
4. Start Docker Desktop again

### 5. Reset Docker Desktop to Factory Defaults

```powershell
# In PowerShell (as admin)
& 'C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe' reset
```

### 6. Check if Another Virtual Machine is Running

VirtualBox, VMware, or Hyper-V VMs can conflict with Docker.

### 7. Run Docker Without Administrator

Try running Docker Desktop as a regular user (not as Administrator).

---

## Quick Alternative: Use Node.js Directly

If Docker continues to have issues, you can run the POS directly with Node.js:

```powershell
# Install Node.js from https://nodejs.org (v18+)

# Then run:
cd server
npm install
npm run seed
npm start

# In another terminal:
cd client
npm install
npm run dev
```

---

## If None of Above Works

Try checking Docker logs:
```powershell
Get-Content "$env:APPDATA\Local\Docker\log\*.log" -Tail 50
```

Or contact Docker support with the error logs from:
```
%LOCALAPPDATA%\Docker\log\
```
