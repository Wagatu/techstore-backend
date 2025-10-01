const express = require('express');
const { Order, Product, GuestOrder } = require('../models');
const EmailService = require('../services/emailService');
const router = express.Router();

// Create guest order
router.post('/order', async (req, res) => {
  try {
    const { 
      items, 
      shippingAddress, 
      billingAddress, 
      paymentMethod, 
      customerNotes,
      deliveryOption,
      guestEmail,
      guestPhone 
    } = req.body;

    // Validate required fields
    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    if (!shippingAddress || !billingAddress || !paymentMethod || !guestEmail) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address, billing address, payment method, and email are required'
      });
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

      if (product.discount > 0) {
        const itemDiscount = (product.price * product.discount / 100) * item.quantity;
        discount += itemDiscount;
      }

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

    // Calculate shipping (simplified for guest checkout)
    let shippingFee = 0;
    if (deliveryOption === 'express') {
      shippingFee = 49.99;
    } else if (deliveryOption === 'standard') {
      shippingFee = totalAmount > 500 ? 0 : 29.99;
    }

    const tax = totalAmount * 0.1;
    const finalAmount = totalAmount - discount + shippingFee + tax;

    // Generate order number
    const generateOrderNumber = () => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `TSG${timestamp}${random}`; // TSG for guest orders
    };

    // Create guest order
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      userId: null, // No user association
      items: validatedItems,
      totalAmount,
      discount,
      shippingFee,
      finalAmount,
      paymentMethod,
      shippingAddress: {
        ...shippingAddress,
        email: guestEmail,
        phone: guestPhone
      },
      billingAddress: {
        ...billingAddress,
        email: guestEmail,
        phone: guestPhone
      },
      customerNotes: customerNotes || `Guest order - Delivery: ${deliveryOption}`,
      status: 'confirmed',
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid',
      isGuestOrder: true
    });

    // Update product stock
    for (const item of validatedItems) {
      const product = await Product.findByPk(item.productId);
      await product.decrement('stock', { by: item.quantity });
    }

    // Send guest order confirmation email
    await EmailService.sendGuestOrderConfirmation(order, {
      email: guestEmail,
      fullName: shippingAddress.firstName + ' ' + shippingAddress.lastName
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        guestAccessToken: generateGuestAccessToken(order.id)
      },
      message: 'Guest order created successfully'
    });

  } catch (error) {
    console.error('Guest order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating guest order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Generate guest access token for order tracking
function generateGuestAccessToken(orderId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { orderId, type: 'guest' }, 
    process.env.JWT_SECRET, 
    { expiresIn: '30d' }
  );
}

// Track guest order
router.get('/order/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    const order = await Order.findOne({
      where: { 
        orderNumber,
        isGuestOrder: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify email matches order email
    if (order.shippingAddress.email !== email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Return limited order info for guest
    const orderInfo = {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      finalAmount: order.finalAmount,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      items: order.items
    };

    res.json({
      success: true,
      data: {
        order: orderInfo
      }
    });

  } catch (error) {
    console.error('Guest order tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching guest order'
    });
  }
});

// Convert guest order to user account
router.post('/convert-to-account', async (req, res) => {
  try {
    const { orderNumber, email, password, fullName } = req.body;

    const order = await Order.findOne({
      where: { 
        orderNumber,
        isGuestOrder: true
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Create new user
      user = await User.create({
        fullName,
        email,
        password,
        phone: order.shippingAddress.phone
      });
    }

    // Associate order with user
    await order.update({
      userId: user.id,
      isGuestOrder: false
    });

    // Generate auth token
    const token = user.generateToken();

    res.json({
      success: true,
      token,
      data: {
        user,
        order
      },
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Convert to account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error converting to account'
    });
  }
});

module.exports = router;