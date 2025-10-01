const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  items: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('items');
      try {
        return JSON.parse(rawValue || '[]');
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('items', JSON.stringify(value || []));
    }
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'Total amount cannot be negative' }
    }
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  shippingFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  finalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    ),
    defaultValue: 'pending'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'paypal', 'bank_transfer', 'cash_on_delivery'),
    allowNull: false
  },
  shippingAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('shippingAddress');
      try {
        return JSON.parse(rawValue || '{}');
      } catch {
        return {};
      }
    },
    set(value) {
      this.setDataValue('shippingAddress', JSON.stringify(value || {}));
    }
  },
  billingAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('billingAddress');
      try {
        return JSON.parse(rawValue || '{}');
      } catch {
        return {};
      }
    },
    set(value) {
      this.setDataValue('billingAddress', JSON.stringify(value || {}));
    }
  },
  customerNotes: {
    type: DataTypes.TEXT
  },
  estimatedDelivery: {
    type: DataTypes.DATE
  },
  trackingNumber: {
    type: DataTypes.STRING
  },
  carrier: {
    type: DataTypes.STRING
  },
  isGuestOrder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['paymentStatus'] },
    { fields: ['orderNumber'] }
  ],
  tableName: 'orders'
});

module.exports = Order;