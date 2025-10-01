const express = require('express');
const { Order, User, Product } = require('../models');
const { protect } = require('../middleware/auth');
const EmailService = require('../services/emailService');
const router = express.Router();

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TS${timestamp}${random}`;
};

// Get user's orders
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        orders
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
});

// Create new order
router.post('/', protect, async (req, res) => {
  try {
    const { 
      items, 
      shippingAddress, 
      billingAddress, 
      paymentMethod, 
      customerNotes,
      deliveryOption 
    } = req.body;

    // Validate required fields
    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    if (!shippingAddress || !billingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address, billing address, and payment method are required'
      });
    }

    // Validate shipping address fields
    const requiredShippingFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'zipCode'];
    for (const field of requiredShippingFields) {
      if (!shippingAddress[field]) {
        return res.status(400).json({
          success: false,
          message: `Shipping address ${field} is required`
        });
      }
    }

    // Calculate totals and validate products
    let totalAmount = 0;
    let discount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is not available`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      // Calculate discount if any
      if (product.discount > 0) {
        const itemDiscount = (product.price * product.discount / 100) * item.quantity;
        discount += itemDiscount;
      }

      // Add product details to validated items
      validatedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
        brand: product.brand,
        category: product.category
      });
    }

    // Calculate shipping fee based on delivery option
    let shippingFee = 0;
    if (deliveryOption === 'express') {
      shippingFee = 49.99;
    } else if (deliveryOption === 'standard') {
      shippingFee = totalAmount > 500 ? 0 : 29.99;
    } else if (deliveryOption === 'pickup') {
      shippingFee = 0;
    }

    const tax = totalAmount * 0.1; // 10% tax
    const finalAmount = totalAmount - discount + shippingFee + tax;

    // Create order in database
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId: req.user.id,
      items: validatedItems,
      totalAmount,
      discount,
      shippingFee,
      finalAmount,
      paymentMethod,
      shippingAddress,
      billingAddress,
      customerNotes: customerNotes || `Delivery: ${deliveryOption}`,
      status: 'confirmed',
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid',
      isGuestOrder: false
    });

    // Update product stock immediately
    for (const item of validatedItems) {
      const product = await Product.findByPk(item.productId);
      await product.decrement('stock', { by: item.quantity });
    }

    // Send order confirmation email
    try {
      await EmailService.sendOrderConfirmation(order, req.user);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the order if email fails
    }

    res.status(201).json({
      success: true,
      data: {
        order
      },
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('Create order error:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update order status 
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, paymentStatus, trackingNumber, carrier } = req.body;
    
    const order = await Order.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (carrier) updateData.carrier = carrier;

    await order.update(updateData);

    res.json({
      success: true,
      data: {
        order
      },
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
});

// Cancel order
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        await product.increment('stock', { by: item.quantity });
      }
    }

    await order.update({ 
      status: 'cancelled',
      paymentStatus: order.paymentStatus === 'paid' ? 'refunded' : 'cancelled'
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
});

module.exports = router;