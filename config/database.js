const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.NODE_ENV === 'production') {
  // PostgreSQL for production (Render)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20, // Higher for production
      min: 0,
      acquire: 60000, // Higher timeout for production
      idle: 10000
    },
    retry: {
      match: [
        /ConnectionError/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /TimeoutError/,
        /SequelizeDatabaseError/
      ],
      max: 3 // Retry 3 times on connection errors
    }
  });
} else {
  // SQLite for development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './techstore.sqlite',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ PostgreSQL database connection established successfully.');
    } else {
      console.log('✅ SQLite database connection established successfully.');
    }
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('✅ Database synced successfully.');
    
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      console.log('💡 Make sure your DATABASE_URL is correct and PostgreSQL instance is running.');
    }
  }
};

// Call this when the module is loaded
testConnection();

module.exports = { sequelize, testConnection };