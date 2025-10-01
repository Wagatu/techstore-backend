const express = require('express');
const { Product } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Get all products with filtering, sorting and pagination
router.get('/', async (req, res) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      minRating,
      search,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const whereClause = { isActive: true };
    
    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (brand && brand !== 'all') {
      whereClause.brand = brand;
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.$gte = parseFloat(minPrice);
      if (maxPrice) whereClause.price.$lte = parseFloat(maxPrice);
    }

    if (minRating) {
      whereClause.rating = { $gte: parseFloat(minRating) };
    }

    if (search) {
      whereClause.$or = [
        { name: { $iLike: `%${search}%` } },
        { description: { $iLike: `%${search}%` } },
        { category: { $iLike: `%${search}%` } },
        { brand: { $iLike: `%${search}%` } },
        { tags: { $contains: [search] } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows: products } = await Product.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalProducts: count,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not available'
      });
    }

    res.json({
      success: true,
      data: {
        product
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create product (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const productData = req.body;
    
    // Generate SKU if not provided
    if (!productData.sku) {
      productData.sku = `TS${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      data: {
        product
      }
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update product (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.update(req.body);

    res.json({
      success: true,
      data: {
        product
      }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
  }
});

// Delete product (Admin only - soft delete)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.update({ isActive: false });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// Get product categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Product.rawAttributes.category.values;
    
    res.json({
      success: true,
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Get product brands
router.get('/meta/brands', async (req, res) => {
  try {
    const brands = await Product.findAll({
      attributes: ['brand'],
      group: ['brand'],
      raw: true
    });
    
    const brandList = brands.map(item => item.brand);

    res.json({
      success: true,
      data: {
        brands: brandList
      }
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brands'
    });
  }
});

module.exports = router;