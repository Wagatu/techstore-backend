const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Order = require('./Order');

// Define associations
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Initialize database connection and sync models
const initializeDatabase = async () => {
  await testConnection();
  
  console.log('📦 Database Models:');
  console.log('   ✅ Users');
  console.log('   ✅ Products'); 
  console.log('   ✅ Orders');
};

// Export models and initialization function
module.exports = {
  sequelize,
  User,
  Product,
  Order,
  initializeDatabase
};