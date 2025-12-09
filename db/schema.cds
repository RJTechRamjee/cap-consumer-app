namespace consumer.db;

entity Orders {
  key ID              : UUID;
      productID       : UUID;
      quantity        : Integer;
      customerName    : String(100);
      orderDate       : DateTime;
      
      // Fields enriched from remote API
      productName     : String(100);
      productPrice    : Decimal(10, 2);
      totalAmount     : Decimal(10, 2);
}