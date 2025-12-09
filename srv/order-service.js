const cds = require('@sap/cds');

module.exports = async function () {
  const { Orders } = this.entities;

  // Connect to the remote CAP Provider service
  const providerAPI = await cds.connect.to('CatalogService');
  const { Products } = providerAPI.entities;

  // Before creating an order, set the orderDate
  this.before('CREATE', Orders, async (req) => {
    req.data.orderDate = new Date().toISOString();
  });

  // Validate product exists before creating order
  this.before('CREATE', Orders, async (req) => {
    if (req.data.productID) {
      try {

        // Use providerAPI.read() to query the remote service
        const products = await providerAPI.read(Products)
          .where({ ID: req.data.productID });

        // providerAPI.read() returns an array, so check length and get first item
        if (!products || products.length === 0) {
          req.error(400, `Product ${req.data.productID} does not exist`);
          return;
        }

        const product = products[0];

        // Pre-fill product data
        req.data.productName = product.name;
        req.data.productPrice = product.price;
        req.data.totalAmount = product.price * (req.data.quantity || 1);

      } catch (error) {
        console.error('Could not validate product:', error.message);
      }
    }
  });
};