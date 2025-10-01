const { Sequelize } = require('sequelize');

console.log('🔧 Database Configuration Starting...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

let sequelize;

if (process.env.NODE_ENV === 'production') {
  // Production - PostgreSQL
  if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL is required in production');
    process.exit(1);
  }
  
  console.log('🔧 Using PostgreSQL in production');
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
  });
} else {
  // Development - SQLite
  console.log('🔧 Using SQLite in development');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './techstore.sqlite',
    logging: console.log
  });
}

// Test database connection with better error handling
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ PostgreSQL database connection established successfully.');
    } else {
      console.log('✅ SQLite database connection established successfully.');
    }
    
    // Sync database without forcing (to avoid table recreation)
    await sequelize.sync({ 
      force: false, // Don't drop and recreate tables
      alter: false  // Don't alter existing tables
    });
    
    console.log('✅ Database synced successfully.');
    
  } catch (error) {
    console.error('❌ Database sync error:', error.message);
    
    // If it's a relation already exists error, continue anyway
    if (error.message.includes('already exists')) {
      console.log('💡 Tables already exist, continuing...');
      return;
    }
    
    process.exit(1);
  }
};

testConnection();

module.exports = { sequelize, testConnection };