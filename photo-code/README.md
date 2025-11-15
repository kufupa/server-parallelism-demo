# Photo Code - TypeScript Photo Data Utilities

This directory contains TypeScript utilities for fetching, processing, and converting photo data from the WideWorldImporters database.

## Files

- **fetchPhotos.ts** - Main script to fetch real photo examples from the database
- **photoConverter.ts** - Utilities for photo format conversion and analysis
- **package.json** - Project dependencies and scripts
- **tsconfig.json** - TypeScript configuration

## Installation

```bash
npm install
```

## Usage

### Fetch Photos from Database

```bash
npm run dev
```

Or compile and run:

```bash
npm run build
npm start
```

## What It Does

### fetchPhotos.ts

Fetches real photo data from two tables in the WideWorldImporters database:

1. **Product Photos** from `Warehouse.StockItems`
   - Returns product name, brand, price, and photo binary data
   - Calculates photo file size in KB
   - Converts to base64 for transmission

2. **Employee Photos** from `Application.People`
   - Returns employee name, email, and photo binary data
   - Filters to only employees (not just contacts)
   - Includes photo size metrics

### photoConverter.ts

Provides utilities for:
- Converting photo buffers to base64 strings
- Detecting image MIME types from magic bytes
- Creating data URLs for HTML img tags
- Analyzing photo quality and format
- Estimating dimensions (JPEG/PNG)
- Converting between formats

## Database Schema

### Warehouse.StockItems

```
StockItemID (Primary Key)
StockItemName (varchar)
Brand (varchar)
UnitPrice (decimal)
Photo (VARBINARY(MAX)) ← Photo data here
```

### Application.People

```
PersonID (Primary Key)
FullName (varchar)
EmailAddress (varchar)
IsEmployee (bit)
Photo (VARBINARY(MAX)) ← Photo data here
```

## Example Output

When you run the script, you'll see:

```
📸 Fetching Real Photo Data from WideWorldImporters Database

======================================================================

🛍️  PRODUCT PHOTOS (Top 5)

1. [Product Name]
   ID: [StockItemID]
   Brand: [Brand]
   Price: $[UnitPrice]
   Photo Size: [Size] KB
   Base64 Preview: [First 80 chars]...

...

👥 EMPLOYEE PHOTOS (Top 5)

1. [Employee Name]
   ID: [PersonID]
   Email: [Email]
   Is Employee: true
   Photo Size: [Size] KB
   Base64 Preview: [First 80 chars]...

======================================================================

✅ Photo data retrieval completed!
```

## Photo Data Characteristics

- **Format**: Most are JPEG images (detected via magic bytes)
- **Size**: Typically 30-150 KB per photo
- **Storage**: Binary data stored in VARBINARY(MAX) columns
- **Availability**: Not all products/employees have photos (Photo column is nullable)

## Security Notes

- Database credentials are environment-configurable
- Set `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` environment variables
- Uses secure connection (SSL/TLS) to AWS RDS

## Next Steps

- Optimize photo delivery with compression
- Implement caching for frequently accessed photos
- Add photo upload functionality
- Create API endpoint for photo retrieval
