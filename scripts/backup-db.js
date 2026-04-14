const path = require('path');

// Resolve mongoose from server directory
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';
const BACKUP_RETENTION_DAYS = 14;

// Helper function to clean up old backups
function cleanupOldBackups(backupsRootDir) {
  if (!fs.existsSync(backupsRootDir)) {
    return;
  }
  
  const dirs = fs.readdirSync(backupsRootDir).filter(f => f.startsWith('backup_'));
  const now = Date.now();
  let deletedCount = 0;
  
  for (const dir of dirs) {
    const dirPath = path.join(backupsRootDir, dir);
    const stats = fs.statSync(dirPath);
    
    if (stats.isDirectory()) {
      const ageInDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageInDays > BACKUP_RETENTION_DAYS) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`  - Deleted old backup: ${dir} (${Math.floor(ageInDays)} days old)`);
        deletedCount++;
      }
    }
  }
  
  if (deletedCount > 0) {
    console.log(`  - Removed ${deletedCount} old backup(s) older than ${BACKUP_RETENTION_DAYS} days`);
  }
}

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupRootDir = path.join(__dirname, '..', 'backups');
  const backupDir = path.join(backupRootDir, `backup_${timestamp}`);
  
  console.log('========================================');
  console.log('       Backing Up Vela POS Database');
  console.log('========================================');
  console.log();
  
  // Create backup root directory if it doesn't exist
  if (!fs.existsSync(backupRootDir)) {
    fs.mkdirSync(backupRootDir, { recursive: true });
  }
  
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
    console.log('Cleaning up old backups (keeping last 14 days)...');
    console.log('========================================');
    console.log();
    
    // Clean up old backups
    cleanupOldBackups(backupRootDir);
    
    console.log();
    console.log('========================================');
    console.log('Backup completed successfully!');
    console.log('========================================');
    console.log();
    console.log(`Backup location: ${backupDir}`);
    console.log();
    console.log(`Backups older than ${BACKUP_RETENTION_DAYS} days will be automatically removed.`);
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
