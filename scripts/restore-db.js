const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const fs = require('fs');
const { exec } = require('child_process');
const net = require('net');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

// MongoDB configuration - matching start-server.bat
const MONGODB_PATH = 'C:\\Users\\user\\Documents\\Vela\\mongodb-win32-x86_64-windows-6.0.14\\bin\\mongod.exe';
const MONGODB_DATA_PATH = 'C:\\Users\\user\\Documents\\Vela\\data\\db';
const MONGODB_LOG_PATH = 'C:\\Users\\user\\Documents\\Vela\\data\\log\\mongod.log';

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
  const dataDir = path.join(__dirname, '..', 'data', 'db');
  const logDir = path.join(__dirname, '..', 'data', 'log');
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Resolve absolute paths
  const absDataPath = path.resolve(__dirname, '..', 'data', 'db');
  const absLogPath = path.resolve(__dirname, '..', 'data', 'log', 'mongod.log');

  // Try bundled MongoDB first, then system MongoDB
  let mongoPath = MONGODB_PATH;
  if (!fs.existsSync(mongoPath)) {
    // Try system MongoDB
    mongoPath = 'mongod';
  }

  return new Promise((resolve) => {
    const mongoProcess = exec(`"${mongoPath}" --dbpath "${absDataPath}" --logpath "${absLogPath}" --bind_ip 127.0.0.1 --port 27017`, {
      cwd: path.join(__dirname, '..')
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
  const backupDir = path.join(__dirname, '..', 'backups');

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

    const selectedBackup = path.join(backupDir, backups[index]);

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
