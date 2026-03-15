const path = require('path');

// Resolve mongoose from server directory
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const fs = require('fs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

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
  
  console();
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
          
          // Insert the data
          if (data.length > 0) {
            await mongoose.connection.db.collection(collectionName).insertMany(data);
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
