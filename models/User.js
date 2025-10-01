const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  facebookId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Full name is required' },
      len: { args: [2, 100], msg: 'Full name must be between 2 and 100 characters' }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: { msg: 'Email already exists' },
    validate: {
      isEmail: { msg: 'Please provide a valid email' },
      notEmpty: { msg: 'Email is required' }
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Phone number is required' }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Password is required' },
      len: { args: [6, 100], msg: 'Password must be at least 6 characters' }
    }
  },
  role: {
    type: DataTypes.ENUM('customer', 'admin'),
    defaultValue: 'customer'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'users', // Explicit table name for PostgreSQL
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  },
  // Add indexes for better PostgreSQL performance
  indexes: [
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['isActive'] },
    { fields: ['googleId'] },
    { fields: ['facebookId'] }
  ]
});

// Instance methods
User.prototype.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

User.prototype.generateToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: this.id }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Override toJSON to exclude password
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

// Class methods (optional but useful)
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByGoogleId = function(googleId) {
  return this.findOne({ where: { googleId } });
};

User.findByFacebookId = function(facebookId) {
  return this.findOne({ where: { facebookId } });
};

module.exports = User;