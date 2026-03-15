const path = require('path');

// Resolve mongoose from server directory
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `backup_${timestamp}`);
  
  console.log('========================================');
  console.log('       Backing Up Vela POS Database');
  console.log('========================================');
  console.log();
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  console.log(`Creating backup in: ${backupDir}`);
  console.log();
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log();
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Backing up: ${collectionName}...`);
      
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      
      const filePath = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`  - Saved ${data.length} documents`);
    }
    
    console.log();
    console.log('========================================');
    console.log('Backup completed successfully!');
    console.log('========================================');
    console.log();
    console.log(`Backup location: ${backupDir}`);
    console.log();
    console.log('To restore this backup, run:');
    console.log('  scripts\\restore-db.bat');
    console.log();
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('Backup failed:', error.message);
    process.exit(1);
  }
}

backupDatabase();
