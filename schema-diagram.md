# WideWorldImporters Database Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION (Reference Data)                              │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Countries   │  │ StateProvinces│  │   Cities     │  │   People     │            │
│  │──────────────│  │──────────────│  │──────────────│  │──────────────│            │
│  │ CountryID    │  │StateProvinceID│  │   CityID     │  │  PersonID    │            │
│  │ CountryName  │  │ StateProvCode │  │  CityName    │  │  FullName    │            │
│  │ Continent    │  │ SalesTerritory│  │ Population   │  │  IsEmployee  │            │
│  │ Region       │  │  └─ CountryID │  │  └─StateID   │  │  IsSalesman  │            │
│  └──────────────┘  └──────────────┘  └──────────────┘  │ EmailAddress │            │
│                                                         │    Photo     │            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   Phone      │            │
│  │ PaymentMethods│  │DeliveryMethods│  │Transaction │  └──────────────┘            │
│  │──────────────│  │──────────────│  │   Types     │                               │
│  │PaymentMethodID│  │DeliveryMethodID│  │─────────────│                             │
│  │MethodName   │  │ MethodName   │  │ TypeID      │                               │
│  └──────────────┘  └──────────────┘  │ TypeName    │                               │
│                                        └──────────────┘                               │
│  ┌──────────────────────┐  ┌──────────────────────┐                                │
│  │ SystemParameters     │  │ HackathonMetadata    │                                │
│  │──────────────────────│  │──────────────────────│                                │
│  │DeliveryAddress       │  │ParticipantID         │                                │
│  │PostalAddress         │  │ParticipantName       │                                │
│  │ApplicationSettings   │  │DatabaseName          │                                │
│  └──────────────────────┘  └──────────────────────┘                                │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         WAREHOUSE (Inventory Management)                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐            │
│  │                        StockItems (227)                             │            │
│  │  ┌───────────────────────────────────────────────────────────────┐  │            │
│  │  │ StockItemID │ StockItemName │ Brand │ Size │ TaxRate         │  │            │
│  │  │ UnitPrice   │ SupplierID ──┐ ColorID ─┐ Photo                │  │            │
│  │  │ Barcode     │ UnitPackageID │         │     │                │  │            │
│  │  │ IsChillerStock             │         │     │                │  │            │
│  │  └───────────────────────────────────────────────────────────────┘  │            │
│  │                               │         │                           │            │
│  └───────────────────────────────┼─────────┼───────────────────────────┘            │
│                                  │         │                                       │
│  ┌──────────────────────┐        │    ┌────────────────┐   ┌──────────────────┐   │
│  │ StockItemHoldings    │        │    │    Colors      │   │  PackageTypes    │   │
│  │──────────────────────│        │    │────────────────│   │──────────────────│   │
│  │ QuantityOnHand       │        │    │ ColorID        │   │ PackageTypeID    │   │
│  │ BinLocation          │        │    │ ColorName      │   │ PackageTypeName  │   │
│  │ ReorderLevel         │        │    └────────────────┘   └──────────────────┘   │
│  │ TargetStockLevel     │        │                                                 │
│  └──────────────────────┘        │                                                 │
│                                  │    ┌────────────────┐   ┌──────────────────┐   │
│  ┌──────────────────────┐        │    │  StockGroups   │   │ StockItemTrans   │   │
│  │StockItemStockGroups  │        │    │────────────────│   │──────────────────│   │
│  │──────────────────────│        │    │ StockGroupID   │   │ TransactionID    │   │
│  │ StockItemID ─────────┼────────┘    │ GroupName      │   │ StockItemID      │   │
│  │ StockGroupID ────────┼─────┐       └────────────────┘   │ TransactionType  │   │
│  └──────────────────────┘     │                            │ Quantity         │   │
│                               │       ┌──────────────────────────────────────┤   │
│  ┌──────────────────────┐     │       │ (also links to Orders, Invoices,  │   │
│  │ColdRoomTemperatures  │     └──────┤  Suppliers, Customers via FK)     │   │
│  │  (3.7M+ rows)        │            └──────────────────────────────────────┘   │
│  │──────────────────────│                                                       │
│  │ SensorNumber         │     ┌──────────────────────┐                          │
│  │ RecordedWhen         │     │ VehicleTemperatures  │                          │
│  │ Temperature          │     │  (68K rows)          │                          │
│  └──────────────────────┘     │──────────────────────│                          │
│                               │ VehicleRegistration  │                          │
│                               │ ChillerSensorNumber  │                          │
│                               │ RecordedWhen         │                          │
│                               │ Temperature          │                          │
│                               └──────────────────────┘                          │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                    PURCHASING (Supplier & Purchase Orders)                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌──────────────────────────────────────────┐  ┌──────────────────────────────┐    │
│  │         Suppliers (13)                   │  │  SupplierCategories (9)      │    │
│  │  ┌────────────────────────────────────┐  │  │  ┌──────────────────────┐    │    │
│  │  │ SupplierID  │ SupplierName        │  │  │  │ CategoryID │ Name     │    │    │
│  │  │ DeliveryCityID ──┐ PostalCityID  │  │  │  │            │          │    │    │
│  │  │ PrimaryContactPersonID ┐ Alternate│  │  │  └──────────────────────┘    │    │
│  │  │ DeliveryMethodID ──┐   │ Contact  │  │  │                              │    │
│  │  │ PhoneNumber │ WebsiteURL   │      │  │  │  [Each Supplier has a       │    │
│  │  │ BankAccountInfo   │ Address │     │  │  │   SupplierCategoryID]      │    │
│  │  │ PaymentDays       │        │      │  │  │                              │    │
│  │  └────────────────────────────────────┘  │  │                              │    │
│  │             │                            │  └──────────────────────────────┘    │
│  └─────────────┼────────────────────────────┘                                     │
│                │                                                                    │
│  ┌─────────────▼──────────────────────────────────────────┐                       │
│  │      PurchaseOrders (2,082)                            │                       │
│  │  ┌──────────────────────────────────────────────────┐  │                       │
│  │  │ PurchaseOrderID  │ SupplierID ──┐ OrderDate     │  │                       │
│  │  │ ContactPersonID ──┐ DeliveryMethodID ──┐        │  │                       │
│  │  │ ExpectedDeliveryDate │ SupplierReference│       │  │                       │
│  │  │ IsOrderFinalized │ Comments             │       │  │                       │
│  │  └──────────────────────────────────────────────────┘  │                       │
│  │             │                                          │                       │
│  │             │       ┌──────────────────────────────┐   │                       │
│  │             └──────▶│ PurchaseOrderLines (8,399)   │   │                       │
│  │                     │──────────────────────────────│   │                       │
│  │                     │ PurchaseOrderID              │   │                       │
│  │                     │ StockItemID ────┐ OrderedOuters│   │                       │
│  │                     │ PackageTypeID ──┐ ReceivedOuters│   │                       │
│  │                     │ LastReceiptDate │ IsFinalized│   │                       │
│  │                     └──────────────────────────────┘   │                       │
│  │                                                        │                       │
│  └────────────────────────────────────────────────────────┘                       │
│                                                                                    │
│  ┌──────────────────────────────────────────────────────────┐                    │
│  │      SupplierTransactions (2,444)                        │                    │
│  │  ┌────────────────────────────────────────────────────┐  │                    │
│  │  │ TransactionID │ SupplierID │ TransactionTypeID    │  │                    │
│  │  │ PaymentMethodID ──┐ PurchaseOrderID ──┐           │  │                    │
│  │  │ TransactionDate │ AmountExcludingTax  │           │  │                    │
│  │  │ TaxAmount │ TransactionAmount          │           │  │                    │
│  │  │ OutstandingBalance │ IsFinalized       │           │  │                    │
│  │  └────────────────────────────────────────────────────┘  │                    │
│  │                                                          │                    │
│  └──────────────────────────────────────────────────────────┘                    │
│                                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                       SALES (Orders, Invoices, Customers)                                │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                            │
│  ┌───────────────────────────────────────────┐  ┌──────────────────────────────────┐   │
│  │       Customers (663)                     │  │ CustomerCategories (8)           │   │
│  │  ┌───────────────────────────────────────┐│  │ ┌──────────────────────────────┐ │   │
│  │  │ CustomerID  │ CustomerName           ││  │ │ CategoryID │ CategoryName    │ │   │
│  │  │ BillToCustomerID ──┐ CategoryID ──┐ ││  │ │                              │ │   │
│  │  │ BuyingGroupID ──┐ PrimaryContactID││  │ │ └──────────────────────────────┘ │   │
│  │  │ DeliveryMethodID ──┐ DeliveryCityID│││  │ │                                 │   │
│  │  │ PostalCityID ──┐ CreditLimit      │││  │ │ [Each Customer has a          │   │
│  │  │ AccountOpenedDate │ IsOnCreditHold│││  │ │  CategoryID & BuyingGroupID]  │   │
│  │  │ PaymentDays   │ StandardDiscount  │││  │ │                                 │   │
│  │  │ DeliveryRun   │ RunPosition       │││  │ │                                 │   │
│  │  │ Address │ Phone │ Website         │││  │ └──────────────────────────────────┘   │
│  │  └───────────────────────────────────┘││  │                                        │
│  │                                        │└──│ ┌──────────────────────────────┐       │
│  │                                        └───│─│  BuyingGroups (2)            │       │
│  │                                            │ │ ┌──────────────────────────┐ │       │
│  └────────────────────────────────────────────┤ │ │ BuyingGroupID │ GroupName │ │       │
│                                               │ │ │                          │ │       │
│                                               │ │ └──────────────────────────┘ │       │
│         Orders Flow                         │ │                              │       │
│         ─────────────                       │ └──────────────────────────────┘       │
│                                             │                                        │
│  ┌─────────────────────────────────────┐   │                                        │
│  │     Orders (73,849)                 │   │  ┌─────────────────────────────┐       │
│  │  ┌────────────────────────────────┐ │   │  │ SpecialDeals (2)            │       │
│  │  │ OrderID     │ CustomerID ──────┼─┼───┤  │──────────────────────────────│       │
│  │  │ SalespersonID ──┐ PickedByID   │ │   │  │ SpecialDealID │ Description│       │
│  │  │ ContactPersonID ──┐ OrderDate  │ │   │  │ StockItemID ──┐ CustomerID │       │
│  │  │ ExpectedDeliveryDate  │ PONumber│ │   │  │ BuyingGroupID ──┐ CategoryID│       │
│  │  │ IsUndersupplyBackordered │      │ │   │  │ StockGroupID ──┐  StartDate│       │
│  │  │ PickingCompletedWhen │Comments │ │   │  │ DiscountAmount │ Percentage│       │
│  │  │ BackorderOrderID ──┐            │ │   │  │ UnitPrice │ EndDate        │       │
│  │  └────────────────────────────────┘ │   │  └─────────────────────────────┘       │
│  │             │                       │   │                                        │
│  └─────────────┼───────────────────────┘   │                                        │
│                │                                                                     │
│         ┌──────▼──────────────────────────────────────┐                             │
│         │ OrderLines (232,229)                        │                             │
│         │────────────────────────────────────────────│                             │
│         │ OrderLineID │ OrderID │ StockItemID ──┐    │                             │
│         │ PackageTypeID ──┐ Description         │    │                             │
│         │ Quantity │ UnitPrice │ TaxRate        │    │                             │
│         │ PickedQuantity │ PickingCompletedWhen│    │                             │
│         └──────────────────────────────────────────┘                              │
│                                                                                     │
│         Orders → Invoices                                                          │
│                                                                                     │
│  ┌──────────────────────────────────────────────────┐                             │
│  │     Invoices (70,754)                            │                             │
│  │  ┌───────────────────────────────────────────┐   │                             │
│  │  │ InvoiceID    │ CustomerID ──┐ OrderID ────┼──┼─┐                            │
│  │  │ BillToCustomerID ──┐ InvoiceDate        │   │ │                            │
│  │  │ DeliveryMethodID ──┐ ContactPersonID ───│   │ │                            │
│  │  │ AccountsPersonID ──┐ SalespersonID      │   │ │                            │
│  │  │ PackedByPersonID ──┐ PONumber            │   │ │                            │
│  │  │ IsCreditNote │ CreditNoteReason         │   │ │                            │
│  │  │ TotalDryItems │ TotalChillerItems       │   │ │                            │
│  │  │ DeliveryRun │ RunPosition               │   │ │                            │
│  │  │ ConfirmedDeliveryTime │ ConfirmedReceivedBy│ │                            │
│  │  └───────────────────────────────────────────┘   │                            │
│  │             │                                    │                            │
│  └─────────────┼────────────────────────────────────┘                            │
│                │                                                                   │
│         ┌──────▼──────────────────────────────────────┐                           │
│         │ InvoiceLines (229,071)                      │                           │
│         │──────────────────────────────────────────────│                           │
│         │ InvoiceLineID │ InvoiceID │ StockItemID ──┐│                           │
│         │ PackageTypeID ──┐ Description            ││                           │
│         │ Quantity │ UnitPrice │ TaxRate          ││                           │
│         │ TaxAmount │ LineProfit │ ExtendedPrice   ││                           │
│         └──────────────────────────────────────────────┘                         │
│                                                                                   │
│  ┌────────────────────────────────────────────────────┐                         │
│  │ CustomerTransactions (97,537)                      │                         │
│  │────────────────────────────────────────────────────│                         │
│  │ TransactionID │ CustomerID │ TransactionTypeID    │                         │
│  │ InvoiceID ──┐ PaymentMethodID ──┐ TransactionDate│                         │
│  │ AmountExcludingTax │ TaxAmount │ TransactionAmount│                         │
│  │ OutstandingBalance │ IsFinalized │ FinalizationDate│                         │
│  └────────────────────────────────────────────────────┘                         │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘

RELATIONSHIPS SUMMARY:
═════════════════════

APPLICATION → WAREHOUSE:
  • People.PersonID ← StockItems.LastEditedBy (who modified items)
  • Cities.CityID ← StockItemHoldings.* (via Warehouse schema)
  • PaymentMethods.PaymentMethodID ← SupplierTransactions, CustomerTransactions
  • DeliveryMethods.DeliveryMethodID ← Suppliers, Customers, Orders, Invoices

PURCHASING → APPLICATION & WAREHOUSE:
  • Suppliers.SupplierCategoryID ← SupplierCategories
  • Suppliers.DeliveryCityID, PostalCityID ← Cities
  • Suppliers.PrimaryContactPersonID, AlternateContactPersonID ← People
  • PurchaseOrders.SupplierID ← Suppliers
  • PurchaseOrders.ContactPersonID ← People
  • PurchaseOrderLines.StockItemID ← StockItems
  • PurchaseOrderLines.PackageTypeID ← PackageTypes
  • SupplierTransactions.SupplierID ← Suppliers
  • SupplierTransactions.PurchaseOrderID ← PurchaseOrders

SALES → APPLICATION & WAREHOUSE:
  • Customers.CustomerCategoryID ← CustomerCategories
  • Customers.BuyingGroupID ← BuyingGroups
  • Customers.PrimaryContactPersonID, AlternateContactPersonID ← People
  • Customers.DeliveryCityID, PostalCityID ← Cities
  • Orders.CustomerID ← Customers
  • Orders.SalespersonPersonID, ContactPersonID, PickedByPersonID ← People
  • OrderLines.OrderID ← Orders
  • OrderLines.StockItemID ← StockItems
  • OrderLines.PackageTypeID ← PackageTypes
  • Invoices.CustomerID, OrderID ← Customers, Orders
  • Invoices.ContactPersonID, SalespersonPersonID, AccountsPersonID, PackedByPersonID ← People
  • InvoiceLines.InvoiceID ← Invoices
  • InvoiceLines.StockItemID ← StockItems
  • SpecialDeals.StockItemID ← StockItems
  • CustomerTransactions.CustomerID ← Customers
  • CustomerTransactions.InvoiceID ← Invoices

WAREHOUSE:
  • StockItems.SupplierID ← Suppliers
  • StockItems.ColorID ← Colors
  • StockItems.UnitPackageID, OuterPackageID ← PackageTypes
  • StockItemStockGroups.StockItemID ← StockItems
  • StockItemStockGroups.StockGroupID ← StockGroups
  • StockItemTransactions links to Orders/Invoices/Suppliers/Customers
```

## Key Observations

1. **Master Data Flow**: Application tables provide reference data for all other schemas
2. **Order-to-Invoice Pipeline**: Orders → OrderLines → Invoices → InvoiceLines → CustomerTransactions
3. **Supply Side Mirror**: PurchaseOrders → PurchaseOrderLines → SupplierTransactions
4. **Hub Concept**: StockItems is the central hub connecting all business processes
5. **Temporal Tracking**: All data includes ValidFrom/ValidTo for audit trails
6. **Sensor Data**: Large volumes of temperature data for cold chain management (3.7M+ records)
7. **Multi-contact Model**: Customers/Suppliers have Primary and Alternate contacts linked to People
8. **Geographic Distribution**: Everything can be traced back to geographic locations via Cities/StateProvinces
