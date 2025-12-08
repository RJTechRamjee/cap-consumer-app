const cds = require('@sap/cds');
const axios = require('axios');

module.exports = async function() {
  const { Orders } = this.entities;

  // Before creating an order, set the orderDate
  this.before('CREATE', Orders, async (req) => {
    req.data.orderDate = new Date().toISOString();
  });

  // Action: Enrich order with product data using direct HTTP calls
  this.on('enrichOrderWithProduct', Orders, async (req) => {
    const orderID = req.params[0].ID;
    
    const order = await SELECT.one.from(Orders).where({ ID: orderID });
    if (!order) {
      req.error(404, `Order ${orderID} not found`);
      return;
    }

    if (!order.productID) {
      req.error(400, 'Order has no productID to enrich');
      return;
    }

    try {
      // Option 1: Using axios for direct HTTP call
      const baseUrl = process.env.PROVIDER_API_URL || 'http://localhost:4004';
      const productUrl = `${baseUrl}/odata/v4/catalog/Products(${order.productID})`;
      
      console.log(`Fetching product from: ${productUrl}`);
      
      const response = await axios.get(productUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // Optional: Add authentication if needed
        // auth: {
        //   username: 'user',
        //   password: 'pass'
        // }
      });

      const product = response.data;

      if (!product || !product.ID) {
        req.error(404, `Product ${order.productID} not found in remote service`);
        return;
      }

      const totalAmount = product.price * order.quantity;

      await UPDATE(Orders)
        .set({
          productName: product.name,
          productPrice: product.price,
          totalAmount: totalAmount
        })
        .where({ ID: orderID });

      const updatedOrder = await SELECT.one.from(Orders).where({ ID: orderID });
      return updatedOrder;

    } catch (error) {
      console.error('Error calling remote HTTP service:', error.message);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        req.error(error.response.status, `Remote service error: ${error.response.statusText}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from remote service');
        req.error(503, 'Remote service unavailable');
      } else {
        // Something happened in setting up the request
        req.error(500, `Request failed: ${error.message}`);
      }
    }
  });

  // Alternative implementation using fetch API (available in Node.js 18+)
  // Uncomment to use this instead of axios
  /*
  this.on('enrichOrderWithProduct', Orders, async (req) => {
    const orderID = req.params[0].ID;
    
    const order = await SELECT.one.from(Orders).where({ ID: orderID });
    if (!order) {
      req.error(404, `Order ${orderID} not found`);
      return;
    }

    if (!order.productID) {
      req.error(400, 'Order has no productID to enrich');
      return;
    }

    try {
      const baseUrl = process.env.PROVIDER_API_URL || 'http://localhost:4004';
      const productUrl = `${baseUrl}/odata/v4/catalog/Products(${order.productID})`;
      
      console.log(`Fetching product from: ${productUrl}`);
      
      const response = await fetch(productUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        req.error(response.status, `Remote service error: ${response.statusText}`);
        return;
      }

      const product = await response.json();

      const totalAmount = product.price * order.quantity;

      await UPDATE(Orders)
        .set({
          productName: product.name,
          productPrice: product.price,
          totalAmount: totalAmount
        })
        .where({ ID: orderID });

      const updatedOrder = await SELECT.one.from(Orders).where({ ID: orderID });
      return updatedOrder;

    } catch (error) {
      console.error('Error calling remote HTTP service:', error);
      req.error(502, `Failed to fetch product data: ${error.message}`);
    }
  });
  */

  // Helper function to make OData queries with filters
  async function queryProductsWithFilter(filter) {
    const baseUrl = process.env.PROVIDER_API_URL || 'http://localhost:4004';
    const url = `${baseUrl}/odata/v4/catalog/Products?$filter=${encodeURIComponent(filter)}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return response.data.value; // OData returns results in 'value' array
    } catch (error) {
      console.error('Error querying products:', error.message);
      throw error;
    }
  }

  // Example: Search products by category before creating order
  this.before('CREATE', Orders, async (req) => {
    // Example of how to query the remote service with filters
    if (req.data.productID) {
      try {
        // You could validate the product exists
        const baseUrl = process.env.PROVIDER_API_URL || 'http://localhost:4004';
        const productUrl = `${baseUrl}/odata/v4/catalog/Products(${req.data.productID})`;
        
        const response = await axios.get(productUrl, {
          headers: { 'Accept': 'application/json' }
        });
        
        const product = response.data;
        
        if (!product) {
          req.error(400, `Product ${req.data.productID} does not exist`);
          return;
        }
        
        // Pre-fill product data
        req.data.productName = product.name;
        req.data.productPrice = product.price;
        req.data.totalAmount = product.price * (req.data.quantity || 1);
        
      } catch (error) {
        console.warn('Could not validate product:', error.message);
        // Continue anyway - validation is optional
      }
    }
  });
};
