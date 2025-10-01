const axios = require('axios');

class LocationService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }

  toRad(degrees) {
    return degrees * (Math.PI/180);
  }

  // Get coordinates from address using Google Geocoding API
  async geocodeAddress(address) {
    try {
      if (!this.googleMapsApiKey) {
        // Fallback for development
        return this.getMockCoordinates(address);
      }

      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: this.googleMapsApiKey
        }
      });

      if (response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: response.data.results[0].formatted_address
        };
      }
      
      throw new Error('Address not found');
    } catch (error) {
      console.error('Geocoding error:', error);
      return this.getMockCoordinates(address);
    }
  }

  // Mock coordinates for development
  getMockCoordinates(address) {
    // Simple hash function to generate consistent mock coordinates
    const hash = address.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const baseLat = 40.7128; // NYC
    const baseLng = -74.0060;
    
    return {
      lat: baseLat + (hash % 100) / 1000,
      lng: baseLng + (hash % 100) / 1000,
      formattedAddress: address
    };
  }

  // Find nearest store to customer address
  async findNearestStore(customerAddress) {
    const stores = await this.getStores();
    const customerCoords = await this.geocodeAddress(customerAddress);

    let nearestStore = null;
    let minDistance = Infinity;

    for (const store of stores) {
      const distance = this.calculateDistance(
        customerCoords.lat, customerCoords.lng,
        store.lat, store.lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStore = { ...store, distance };
      }
    }

    return nearestStore;
  }

  // Calculate shipping cost based on distance and order value
  async calculateShipping(customerAddress, orderValue, deliveryOption = 'standard') {
    const nearestStore = await this.findNearestStore(customerAddress);
    
    if (!nearestStore) {
      return this.getDefaultShipping(orderValue, deliveryOption);
    }

    let baseCost = 0;

    // Free shipping for orders over $500
    if (orderValue > 500) {
      baseCost = 0;
    } else {
      // Calculate based on distance
      if (nearestStore.distance < 10) {
        baseCost = 9.99; // Local delivery
      } else if (nearestStore.distance < 50) {
        baseCost = 19.99; // Regional delivery
      } else {
        baseCost = 29.99; // National delivery
      }
    }

    // Apply delivery option multiplier
    const multipliers = {
      standard: 1,
      express: 2,
      priority: 3
    };

    const finalCost = baseCost * (multipliers[deliveryOption] || 1);
    
    return {
      cost: finalCost,
      store: nearestStore,
      estimatedDays: this.calculateEstimatedDays(nearestStore.distance, deliveryOption),
      freeShippingEligible: orderValue > 500
    };
  }

  calculateEstimatedDays(distance, deliveryOption) {
    const baseDays = Math.ceil(distance / 100); // 100km per day
    
    const modifiers = {
      standard: baseDays,
      express: Math.max(1, Math.floor(baseDays / 2)),
      priority: 1
    };

    return modifiers[deliveryOption] || baseDays;
  }

  // Get available stores (in production, this would come from a database)
  async getStores() {
    return [
      {
        id: 1,
        name: 'TechStore NYC',
        address: '123 Tech Street, New York, NY 10001',
        lat: 40.7128,
        lng: -74.0060,
        phone: '+1 (555) 123-4567',
        hours: '9:00 AM - 9:00 PM'
      },
      {
        id: 2,
        name: 'TechStore LA',
        address: '456 Innovation Ave, Los Angeles, CA 90001',
        lat: 34.0522,
        lng: -118.2437,
        phone: '+1 (555) 123-4568',
        hours: '9:00 AM - 9:00 PM'
      },
      {
        id: 3,
        name: 'TechStore Chicago',
        address: '789 Gadget Blvd, Chicago, IL 60601',
        lat: 41.8781,
        lng: -87.6298,
        phone: '+1 (555) 123-4569',
        hours: '9:00 AM - 9:00 PM'
      },
      {
        id: 4,
        name: 'TechStore Miami',
        address: '321 Digital Drive, Miami, FL 33101',
        lat: 25.7617,
        lng: -80.1918,
        phone: '+1 (555) 123-4570',
        hours: '9:00 AM - 9:00 PM'
      },
      {
        id: 5,
        name: 'TechStore Seattle',
        address: '654 Tech Way, Seattle, WA 98101',
        lat: 47.6062,
        lng: -122.3321,
        phone: '+1 (555) 123-4571',
        hours: '9:00 AM - 9:00 PM'
      }
    ];
  }

  getDefaultShipping(orderValue, deliveryOption) {
    const baseCost = orderValue > 500 ? 0 : 29.99;
    
    const multipliers = {
      standard: 1,
      express: 1.5,
      priority: 2
    };

    return {
      cost: baseCost * (multipliers[deliveryOption] || 1),
      store: null,
      estimatedDays: 3,
      freeShippingEligible: orderValue > 500
    };
  }

  // Get shipping zones
  getShippingZones() {
    return [
      {
        name: 'Local',
        range: [0, 25], // kilometers
        cost: 9.99,
        deliveryTime: '1-2 days'
      },
      {
        name: 'Regional',
        range: [25, 100],
        cost: 19.99,
        deliveryTime: '2-3 days'
      },
      {
        name: 'National',
        range: [100, Infinity],
        cost: 29.99,
        deliveryTime: '3-5 days'
      }
    ];
  }
}

module.exports = new LocationService();