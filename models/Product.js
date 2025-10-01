const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Product name is required' },
      len: { args: [2, 200], msg: 'Product name must be between 2 and 200 characters' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Product description is required' }
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: { msg: 'Price must be a valid decimal number' },
      min: { args: [0], msg: 'Price cannot be negative' }
    }
  },
  originalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('Laptops', 'Phones', 'Tablets', 'Accessories', 'Wearables'),
    allowNull: false
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Brand is required' }
    }
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Product image is required' }
    }
  },
  images: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('images');
      try {
        return JSON.parse(rawValue || '[]');
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('images', JSON.stringify(value || []));
    }
  },
  specs: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('specs');
      try {
        return JSON.parse(rawValue || '[]');
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('specs', JSON.stringify(value || []));
    }
  },
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Rating cannot be less than 0' },
      max: { args: [5], msg: 'Rating cannot be more than 5' }
    }
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Stock cannot be negative' }
    }
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  discount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Discount cannot be negative' },
      max: { args: [100], msg: 'Discount cannot be more than 100%' }
    }
  },
  tags: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('tags');
      try {
        return JSON.parse(rawValue || '[]');
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('tags', JSON.stringify(value || []));
    }
  },
  features: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('features');
      try {
        return JSON.parse(rawValue || '[]');
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('features', JSON.stringify(value || []));
    }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['brand'] },
    { fields: ['price'] },
    { fields: ['rating'] },
    { fields: ['isActive'] },
    { fields: ['sku'] }
  ],
  // Add this for better PostgreSQL performance
  tableName: 'products'
});

module.exports = Product;