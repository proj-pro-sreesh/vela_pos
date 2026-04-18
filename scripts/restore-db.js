const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

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
