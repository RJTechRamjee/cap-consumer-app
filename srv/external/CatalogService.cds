/* checksum : 29138416f49d0a49bfbe4aa97c7e82f3 */
@cds.external : true
service CatalogService {
  @cds.external : true
  @cds.persistence.skip : true
  @Capabilities.DeleteRestrictions.Deletable : false
  @Capabilities.InsertRestrictions.Insertable : false
  @Capabilities.UpdateRestrictions.Updatable : false
  entity Products {
    @Core.ComputedDefaultValue : true
    key ID : UUID not null;
    name : String(100);
    description : String(500);
    price : Decimal(10, 2);
    stock : Integer;
    category : String(50);
  };
};

