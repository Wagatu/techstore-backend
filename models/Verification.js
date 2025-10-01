const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Verification = sequelize.define('Verification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Phone number is required' }
    }
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['phoneNumber'] },
    { fields: ['expiresAt'] },
    { fields: ['verified'] }
  ]
});

module.exports = Verification;