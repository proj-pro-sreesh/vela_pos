# Vela POS - Restaurant Management System

A comprehensive Point of Sale (POS) system for restaurants built with the MERN stack (MongoDB, Express, React, Node.js).

## Features

- **POS Interface**: Easy order placement with menu categories
- **Table Management**: Visual grid showing table status (available, occupied, reserved)
- **Real-time KOT**: Live Kitchen Order Ticket display for chefs with Socket.io updates
- **Role-based Access**: Dedicated dashboards for Admin, Waiter, Biller, and Kitchen staff
- **Mobile-friendly**: Responsive design for tablets and mobile devices
- **Payment Processing**: Cash, Card, and UPI payment options

## Quick Start

The system uses **MongoDB 6.0** (bundled) for persistent data storage. Demo data is automatically seeded on first run.

### Option 1: Windows One-Click Start (Recommended)

1. **Double-click** `scripts\start-server.bat`
2. Wait for dependencies to install (first time only)
3. MongoDB will start automatically (bundled in project)
4. Two new windows will open for backend and frontend
5. Access the application at **http://localhost:5173**
6. Login with: **admin** / **admin123**

### Option 2: Start with Auto Database Backup

This option automatically backs up your database before starting the server:

1. **Double-click** `scripts\start-and-backup.bat`
2. The system will create a backup of your existing data
3. Then start MongoDB, backend, and frontend
4. Access the application at **http://localhost:5173**

This is recommended for daily use to protect your data.

### Option 3: Create Desktop Shortcut

1. Double-click `scripts\create-shortcut.vbs`
2. A shortcut "Vela POS" will appear on your desktop
3. Double-click the shortcut anytime to start the application

## Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** 6.0 (bundled in project) or 8.0+ - [Download here](https://www.mongodb.com/try/download/community)
- A modern web browser (Chrome, Firefox, Edge)

---

# MongoDB Setup

MongoDB is required for persistent data storage. The application stores data in a local MongoDB database.

## Option 1: Bundled MongoDB 6.0 (Included)

The project includes MongoDB 6.0.14 in the `mongodb-win32-x86_64-windows-6.0.14` folder. The startup script will automatically use this version.

Data will be stored in:
```
C:\Users\user\Documents\Vela\data\db
```

## Option 2: Use System MongoDB (Optional)

If you have MongoDB 6.0+ installed system-wide, you can use that instead by modifying the path in `scripts\start-server.bat`.

### Option 2: Use System MongoDB (Optional)

If you have MongoDB 6.0+ installed system-wide, you can use that instead by modifying the path in `scripts\start-server.bat`.

### Step 1: Download MongoDB

1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0 (or latest)
   - Platform: Windows
   - Package: MSI
3. Click Download

### Step 2: Install MongoDB

1. Run the downloaded MSI file
2. Choose "Complete" installation
3. **Important**: Uncheck "Install MongoDB Compass" (optional, saves time)
4. Click Install
5. Wait for installation to complete

### Step 3: Create Data Directory

MongoDB needs a folder to store databases. The startup script will create this automatically, but you can create it manually:

```cmd
md C:\Users\user\Documents\Vela\data\db
```

### Step 4: Start MongoDB

Open a command prompt and run:

```cmd
mongod --dbpath "C:\Users\user\Documents\Vela\data\db"
```

Keep this terminal window open while using Vela POS!

### Step 5: Verify MongoDB is Running

Open another command prompt and test:

```cmd
mongosh --eval "db.version()"
```

If successful, you'll see the version number.

---

## Option 2: Use MongoDB Atlas (Cloud - Free)

### Step 1: Create Account

1. Go to https://www.mongodb.com/atlas
2. Click "Try Free"
3. Create account with Google or email

### Step 2: Create Cluster

1. Click "Build a Cluster"
2. Select "Free" tier (M0)
3. Choose a cloud provider (AWS/Google/Azure)
4. Select a region closest to you
5. Click "Create Cluster" (may take 1-2 minutes)

### Step 3: Create Database User

1. Click "Database Access" in left menu
2. Click "Add New Database User"
3. Create username and password (remember these!)
4. Click "Add User"

### Step 4: Network Access

1. Click "Network Access" in left menu
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click Confirm

### Step 5: Get Connection String

1. Click "Database" in left menu
2. Click "Connect" button on your cluster
3. Select "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user password

Example:
```
mongodb+srv://myuser:mypassword@cluster0.xyzabc.mongodb.net/vela-pos?retryWrites=true&w=majority
```

---

## Configure .env File

Create or update `.env` in the server directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/vela-pos

# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.xyz.mongodb.net/vela-pos

# JWT Authentication (do not share)
JWT_SECRET=vela-pos-secret-key-change-in-production-2024

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173
```

---

## Manual Setup (Step by Step)

### Step 1: Install Node.js

Download and install Node.js v18+ from https://nodejs.org/

### Step 2: Extract/Clone the Project

Extract the ZIP file to your desired location, e.g., `C:\Vela`

### Step 3: Install Dependencies

Open a command prompt and run:

```bash
cd C:\Vela\server
npm install

cd ..\client
npm install
```

### Step 4: Start the Application

**Terminal 1 - Backend (and start MongoDB first if using local MongoDB):**
```bash
# If using local MongoDB, start it first:
mongod --dbpath "C:\data\db"

# Then start the server:
cd C:\Vela\server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd C:\Vela\client
npm run dev
```

### Step 5: Access the Application

Open your browser and go to: **http://localhost:5173**

---

## Data Storage Options

| Mode | Data Persistence | Setup Required |
|------|------------------|----------------|
| MongoDB Local | Data saved to disk | Install MongoDB (auto-started by script) |
| MongoDB Atlas | Data saved to cloud | Create Atlas account |
| In-Memory | Data lost on restart | Legacy fallback (not recommended) |

**Note**: If MongoDB is configured but unavailable, the system will automatically fall back to in-memory storage.

---

## Demo Credentials

The database is pre-seeded with demo data. Use these credentials to login:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| Admin | admin | admin123 | Full access to all features |
| Waiter | waiter | waiter123 | Place orders, view tables |
| Biller | biller | biller123 | Process payments, generate bills |

---

## After Machine Restart

The application does NOT start automatically. To start it after restarting your computer:

### Option 1: Use Desktop Shortcut (Recommended)

1. Double-click the "Vela POS" shortcut on your desktop
2. Wait a few seconds for the servers to start
3. The application will open in your browser

### Option 2: Manual Start

1. **MongoDB is started automatically** by the startup script

2. Open two command prompt windows

3. **In Terminal 1:**
```bash
cd C:\Vela\server
npm start
```

4. **In Terminal 2:**
```bash
cd C:\Vela\client
npm run dev
```

5. Open http://localhost:5173 in your browser

### Option 3: Use the Batch File

Simply double-click `scripts\start-server.bat` in the project folder.

To stop the system, run `scripts\stop-server.bat`.

---

## Network Access

To access the application from other devices on your network (tablets, phones):

1. Run `scripts\get-ip.bat` to find your local IP address
2. Access via: `http://YOUR_IP:5173`
3. Example: If your IP is `192.168.1.100`, go to `http://192.168.1.100:5173`

---

## Project Structure

```
Vela/
├── server/                 # Backend API (Express.js)
│   ├── config/
│   │   └── database.js    # Database connection (MongoDB or in-memory)
│   ├── models/             # Mongoose models
│   │   ├── User.js
│   │   ├── Category.js
│   │   ├── MenuItem.js
│   │   ├── Table.js
│   │   ├── Order.js
│   │   └── KOT.js
│   ├── seeders/
│   │   └── demo.js         # Demo data seeder
│   └── server.js           # Main server
├── client/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React contexts (Auth, Socket)
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── theme/        # Material-UI theme
│   └── vite.config.js
├── scripts/              # Windows helper scripts
│   ├── start-server.bat          # One-click start
│   ├── stop-server.bat           # Stop server and MongoDB
│   ├── backup-db.bat            # Backup database
│   ├── restore-db.bat           # Restore database
│   ├── create-shortcut.vbs       # Desktop shortcut creator
│   └── get-ip.bat                # Network IP detector
├── .env                  # Environment variables
└── README.md
```

---

## Troubleshooting

### MongoDB Connection Error

If you get "MongoDB Connection Error":
1. Make sure MongoDB is running
2. Check your MONGODB_URI in .env
3. For MongoDB Atlas, ensure your IP is whitelisted

### Server Not Starting

If the server doesn't start:
1. Make sure Node.js is installed (`node --version`)
2. Check that port 5000 is not in use
3. Run `npm install` in both server and client directories

### Port Already in Use

If you get "Port 5000 is already in use":
```bash
# Find and kill the process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Clear Data and Reset

To reset all data to defaults:
1. Run `npm run seed` in the server directory
2. For MongoDB: Drop the vela-pos database and restart

### Dependencies Not Installing

If npm install fails:
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Menu
- `GET /api/menu` - Get menu items
- `GET /api/menu/grouped` - Get menu grouped by category
- `POST /api/menu` - Create menu item (admin)
- `PUT /api/menu/:id` - Update menu item (admin)
- `DELETE /api/menu/:id` - Delete menu item (admin)

### Categories
- `GET /api/categories` - Get categories
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Tables
- `GET /api/tables` - Get all tables
- `GET /api/tables/with-orders` - Get tables with active orders
- `POST /api/tables` - Create table (admin)
- `PUT /api/tables/:id/status` - Update table status

### Orders
- `GET /api/orders` - Get orders
- `GET /api/orders/active` - Get active orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/payment` - Process payment

### KOT (Kitchen Order Ticket)
- `GET /api/kot` - Get all KOTs
- `GET /api/kot/grouped` - Get KOTs grouped by status
- `PUT /api/kot/:id/status` - Update KOT status
- `PUT /api/kot/:id/start` - Start preparing KOT
- `PUT /api/kot/:id/complete` - Complete KOT

### Users
- `GET /api/users` - Get all users (admin)
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user (admin)
- `DELETE /api/users/:id` - Deactivate user (admin)

---

## Technology Stack

- **Frontend**: React 18 + Material-UI (MUI)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM (or in-memory fallback)
- **Real-time**: Socket.io for KOT updates
- **Authentication**: JWT with bcrypt

---

## Backup and Restore

The system includes scripts to backup and restore your MongoDB database.

### Auto Backup on Startup

For automatic database backup every time you start the system:

1. Use `scripts\start-and-backup.bat` instead of `start-server.bat`
2. The system will automatically backup your database before starting
3. Backups are saved in `backups\backup_YYYY-MM-DD_HH-MM-SS`
4. This is recommended for daily use to protect your data

### Manual Backup

To create a backup of your current data:

1. Run `scripts\backup-db.bat`
2. The backup will be saved in `backups\backup_YYYY-MM-DD_HH-MM-SS`
3. You can have multiple backups

### Restore Database

To restore from a previous backup:

1. Run `scripts\restore-db.bat`
2. Select the backup number to restore
3. Confirm the restore (type "yes")
4. The current data will be replaced with the backup

**Note**: The server will be stopped during restore and must be restarted afterwards.

---

## License

ISC
