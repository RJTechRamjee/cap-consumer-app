const cds = require('@sap/cds');

module.exports = async function() {
  const { Orders } = this.entities;
  
  // Connect to the remote CAP Provider service
  const providerAPI = await cds.connect.to('ProviderAPI');
  const { Products } = providerAPI.entities;

  // Before creating an order, set the orderDate
  this.before('CREATE', Orders, async (req) => {
    req.data.orderDate = new Date().toISOString();
  });

  // Action: Enrich order with product data from remote OData service
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
      // Query the remote OData service using CDS query language
      const product = await SELECT.one.from(Products)
        .where({ ID: order.productID });

      if (!product) {
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
      console.error('Error calling remote CAP service:', error);
      req.error(502, `Failed to fetch product data: ${error.message}`);
    }
  });

  // Optional: Validate product exists before creating order
  this.before('CREATE', Orders, async (req) => {
    if (req.data.productID) {
      try {
        const product = await SELECT.one.from(Products)
          .where({ ID: req.data.productID });
        
        if (!product) {
          req.error(400, `Product ${req.data.productID} does not exist`);
        }
        
        // Pre-fill product data
        req.data.productName = product.name;
        req.data.productPrice = product.price;
        req.data.totalAmount = product.price * (req.data.quantity || 1);
        
      } catch (error) {
        console.warn('Could not validate product:', error.message);
      }
    }
  });
};