const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const net = require('net');

// Get the base directory (project root)
const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const SERVER_DIR = path.join(PROJECT_ROOT, 'server');
const NODE_MODULES_DIR = path.join(SERVER_DIR, 'node_modules');

// Install server dependencies if needed
function installServerDeps() {
  return new Promise((resolve) => {
    if (fs.existsSync(NODE_MODULES_DIR) && fs.existsSync(path.join(NODE_MODULES_DIR, 'mongoose'))) {
      console.log('Server dependencies already installed.');
      resolve();
      return;
    }

    console.log('Installing server dependencies...');
    const npmProcess = spawn('npm', ['install'], {
      cwd: SERVER_DIR,
      shell: true,
      stdio: 'inherit'
    });

    npmProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Server dependencies installed.');
        resolve();
      } else {
        console.error('Failed to install server dependencies');
        process.exit(1);
      }
    });
  });
}

// Dynamically load mongoose after deps are installed
let mongoose;
async function loadMongoose() {
  await installServerDeps();
  
  try {
    mongoose = require(path.join(NODE_MODULES_DIR, 'mongoose'));
  } catch (e) {
    // Fall back to system mongoose
    try {
      mongoose = require('mongoose');
    } catch (e2) {
      console.error('Cannot find mongoose. Please run: cd server && npm install');
      process.exit(1);
    }
  }
  return mongoose;
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

// MongoDB configuration - find bundled MongoDB
const BUNDLED_MONGO_PATH = path.join(PROJECT_ROOT, 'mongodb-win32-x86_64-windows-6.0.14', 'bin', 'mongod.exe');
const MONGODB_DATA_PATH = path.join(PROJECT_ROOT, 'data', 'db');
const MONGODB_LOG_PATH = path.join(PROJECT_ROOT, 'data', 'log', 'mongod.log');

// Check if MongoDB is running
function checkMongoDBRunning() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(27017, '127.0.0.1');
  });
}

// Start MongoDB if not running
async function startMongoDB() {
  const isRunning = await checkMongoDBRunning();
  if (isRunning) {
    console.log('MongoDB is already running.');
    return true;
  }

  console.log('MongoDB is not running. Starting MongoDB...');

  // Create data directories if they don't exist
  const dataDir = MONGODB_DATA_PATH;
  const logDir = path.dirname(MONGODB_LOG_PATH);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Use absolute paths
  const absDataPath = path.resolve(PROJECT_ROOT, 'data', 'db');
  const absLogPath = path.resolve(PROJECT_ROOT, 'data', 'log', 'mongod.log');

  // Try bundled MongoDB first, then system MongoDB
  let mongoPath = BUNDLED_MONGO_PATH;
  if (!fs.existsSync(mongoPath)) {
    // Try system MongoDB
    mongoPath = 'mongod';
  }

  return new Promise((resolve) => {
    const mongoProcess = exec(`"${mongoPath}" --dbpath "${absDataPath}" --logpath "${absLogPath}" --bind_ip 127.0.0.1 --port 27017`, {
      cwd: PROJECT_ROOT
    });

    mongoProcess.stdout.on('data', (data) => {
      console.log('MongoDB: ' + data.toString().trim());
    });

    mongoProcess.stderr.on('data', (data) => {
      console.log('MongoDB: ' + data.toString().trim());
    });

    // Wait for MongoDB to start
    setTimeout(async () => {
      const running = await checkMongoDBRunning();
      if (running) {
        console.log('MongoDB started successfully on port 27017');
        resolve(true);
      } else {
        console.log('Warning: Could not verify MongoDB is running. Continuing anyway...');
        resolve(true);
      }
    }, 3000);
  });
}

// Helper function to convert string IDs to ObjectId where appropriate
function convertIds(data, collectionName) {
  if (!Array.isArray(data)) return data;

  const toObjectId = (str) => {
    if (mongoose.Types.ObjectId.isValid(str)) {
      return new mongoose.Types.ObjectId(str);
    }
    return str;
  };

  // Define which fields should be converted to ObjectId for each collection
  const idFields = {
    tables: ['_id', 'currentOrder'],
    orders: ['_id', 'table', 'waiter'],
    users: ['_id'],
    categories: ['_id'],
    menuitems: ['_id', 'category'],
    vendors: ['_id'],
    vendortransactions: ['_id', 'vendorId', 'createdBy']
  };

  const fieldsToConvert = idFields[collectionName] || ['_id'];

  return data.map(doc => {
    const converted = { ...doc };
    fieldsToConvert.forEach(field => {
      if (converted[field]) {
        if (Array.isArray(converted[field])) {
          // Handle arrays (like items in orders)
          converted[field] = converted[field].map(item => {
            if (item && typeof item === 'object' && item.menuItem) {
              return { ...item, menuItem: toObjectId(item.menuItem) };
            }
            return toObjectId(item);
          });
        } else {
          converted[field] = toObjectId(converted[field]);
        }
      }
    });
    return converted;
  });
}

async function restoreDatabase() {
  // Load mongoose first (this also installs server deps)
  console.log('Loading mongoose and checking dependencies...');
  await loadMongoose();
  console.log();

  const backupDir = path.join(PROJECT_ROOT, 'backups');

  // Start MongoDB first
  console.log('Checking MongoDB status...');
  await startMongoDB();
  console.log();

  console.log('========================================');
  console.log('     Restoring Vela POS Database');
  console.log('========================================');
  console.log();

  // List available backups
  console.log('Available backups:');
  console.log();

  if (!fs.existsSync(backupDir)) {
    console.log('No backups found!');
    process.exit(1);
  }

  const backups = fs.readdirSync(backupDir).filter(f => {
    return fs.statSync(path.join(backupDir, f)).isDirectory();
  });

  if (backups.length === 0) {
    console.log('No backups found!');
    process.exit(1);
  }

  backups.forEach((backup, index) => {
    console.log(`  ${index + 1}. ${backup}`);
  });

  console.log();
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter backup number to restore: ', async (selection) => {
    const index = parseInt(selection) - 1;

    if (isNaN(index) || index < 0 || index >= backups.length) {
      console.log('Invalid selection!');
      rl.close();
      process.exit(1);
    }

    const selectedBackup = path.join(PROJECT_ROOT, 'backups', backups[index]);

    console.log();
    console.log('========================================');
    console.log('WARNING: This will replace all current data!');
    console.log('========================================');
    console.log();

    rl.question(`Are you sure you want to restore from: ${backups[index]}? (yes/no): `, async (confirm) => {
      rl.close();

      if (confirm.toLowerCase() !== 'yes') {
        console.log('Restore cancelled.');
        process.exit(0);
      }

      console.log();
      console.log('Restoring database...');
      console.log();

      try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all collection files
        const files = fs.readdirSync(selectedBackup).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const collectionName = file.replace('.json', '');
          console.log(`Restoring: ${collectionName}...`);

          const data = JSON.parse(fs.readFileSync(path.join(selectedBackup, file), 'utf8'));

          // Drop the collection first
          await mongoose.connection.db.collection(collectionName).drop().catch(() => {});

          // Convert IDs to ObjectId where needed
          if (data.length > 0) {
            const convertedData = convertIds(data, collectionName);
            await mongoose.connection.db.collection(collectionName).insertMany(convertedData);
          }

          console.log(`  - Restored ${data.length} documents`);
        }

        console.log();
        console.log('========================================');
        console.log('Restore completed successfully!');
        console.log('========================================');
        console.log();
        console.log('The database has been restored from backup.');
        console.log();
        console.log('Attempting to restart the server automatically...');

        // Try to restart the server
        const http = require('http');
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const req = http.get('http://localhost:5000/api/debug/db-status', (res) => {
            console.log('Server is running. Please RESTART the server to see restored data!');
          });
          req.on('error', () => {
            console.log('Server may need manual restart to see restored data.');
          });
        } catch (e) {
          console.log('Server restart check skipped. Please restart server manually.');
        }
        console.log();

        await mongoose.disconnect();
        process.exit(0);

      } catch (error) {
        console.error('Restore failed:', error.message);
        process.exit(1);
      }
    });
  });
}

restoreDatabase();
