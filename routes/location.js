const express = require('express');
const LocationService = require('../services/locationService');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Calculate shipping cost
router.post('/shipping-cost', async (req, res) => {
  try {
    const { address, orderValue, deliveryOption = 'standard' } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }

    const shippingInfo = await LocationService.calculateShipping(
      address, 
      parseFloat(orderValue) || 0, 
      deliveryOption
    );

    res.json({
      success: true,
      data: shippingInfo
    });

  } catch (error) {
    console.error('Shipping calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating shipping cost'
    });
  }
});

// Find nearest store
router.post('/nearest-store', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const nearestStore = await LocationService.findNearestStore(address);

    res.json({
      success: true,
      data: {
        store: nearestStore
      }
    });

  } catch (error) {
    console.error('Find store error:', error);
    res.status(500).json({
      success: false,
      message: 'Error finding nearest store'
    });
  }
});

// Get all stores
router.get('/stores', async (req, res) => {
  try {
    const stores = await LocationService.getStores();

    res.json({
      success: true,
      data: {
        stores
      }
    });

  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stores'
    });
  }
});

// Get shipping zones
router.get('/shipping-zones', async (req, res) => {
  try {
    const zones = LocationService.getShippingZones();

    res.json({
      success: true,
      data: {
        zones
      }
    });

  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipping zones'
    });
  }
});

// Validate address
router.post('/validate-address', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const validatedAddress = await LocationService.geocodeAddress(address);

    res.json({
      success: true,
      data: {
        address: validatedAddress
      }
    });

  } catch (error) {
    console.error('Address validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating address'
    });
  }
});

module.exports = router;