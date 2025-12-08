using {consumer.db as db} from '../db/schema';

service OrderService {
  entity Orders as projection on db.Orders
    actions {
      action enrichOrderWithProduct() returns Orders;
    };
}