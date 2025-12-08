// External service definition matching the Provider's CatalogService
namespace provider.db;

service CatalogService {
  entity Products {
    key ID          : UUID;
        name        : String(100);
        description : String(500);
        price       : Decimal(10, 2);
        stock       : Integer;
        category    : String(50);
  }
}