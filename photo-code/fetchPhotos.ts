import sql from 'mssql';

// Database Configuration
const config: sql.config = {
  server: 'pepsaco-db-standard.c1oqimeoszvd.eu-west-2.rds.amazonaws.com',
  port: 1433,
  database: 'WideWorldImporters_Base',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'hackathon_ro_05',
      password: process.env.DB_PASSWORD || 'B8^cNp1%',
    },
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

interface StockItemPhoto {
  StockItemID: number;
  StockItemName: string;
  Brand: string;
  UnitPrice: number;
  Photo: Buffer | null;
  PhotoSizeKB: number | null;
}

interface PersonPhoto {
  PersonID: number;
  FullName: string;
  EmailAddress: string;
  IsEmployee: boolean;
  Photo: Buffer | null;
  PhotoSizeKB: number | null;
}

/**
 * Fetch 5 real product photos from the WideWorldImporters database
 */
async function fetchProductPhotos(): Promise<StockItemPhoto[]> {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('✓ Connected to database');

    const result = await pool.request().query<StockItemPhoto[]>(`
      SELECT TOP 5
        si.StockItemID,
        si.StockItemName,
        si.Brand,
        si.UnitPrice,
        si.Photo,
        CASE
          WHEN si.Photo IS NOT NULL THEN DATALENGTH(si.Photo) / 1024
          ELSE NULL
        END as PhotoSizeKB
      FROM Warehouse.StockItems si
      WHERE si.Photo IS NOT NULL
      ORDER BY si.StockItemID
    `);

    return result.recordset;
  } catch (error) {
    console.error('Error fetching product photos:', error);
    throw error;
  } finally {
    await pool.close();
  }
}

/**
 * Fetch 5 real employee photos from the WideWorldImporters database
 */
async function fetchEmployeePhotos(): Promise<PersonPhoto[]> {
  const pool = new sql.ConnectionPool(config);

  try {
    await pool.connect();
    console.log('✓ Connected to database');

    const result = await pool.request().query<PersonPhoto[]>(`
      SELECT TOP 5
        p.PersonID,
        p.FullName,
        p.EmailAddress,
        p.IsEmployee,
        p.Photo,
        CASE
          WHEN p.Photo IS NOT NULL THEN DATALENGTH(p.Photo) / 1024
          ELSE NULL
        END as PhotoSizeKB
      FROM Application.People p
      WHERE p.Photo IS NOT NULL
        AND p.IsEmployee = 1
      ORDER BY p.PersonID
    `);

    return result.recordset;
  } catch (error) {
    console.error('Error fetching employee photos:', error);
    throw error;
  } finally {
    await pool.close();
  }
}

/**
 * Convert photo buffer to base64 string for display
 */
function bufferToBase64(buffer: Buffer | null): string | null {
  if (!buffer) return null;
  return buffer.toString('base64');
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('\n📸 Fetching Real Photo Data from WideWorldImporters Database\n');
    console.log('='.repeat(70));

    // Fetch product photos
    console.log('\n🛍️  PRODUCT PHOTOS (Top 5)\n');
    const productPhotos = await fetchProductPhotos();

    productPhotos.forEach((photo, index) => {
      console.log(`\n${index + 1}. ${photo.StockItemName}`);
      console.log(`   ID: ${photo.StockItemID}`);
      console.log(`   Brand: ${photo.Brand || 'N/A'}`);
      console.log(`   Price: $${photo.UnitPrice}`);
      console.log(`   Photo Size: ${photo.PhotoSizeKB} KB`);
      if (photo.Photo) {
        const base64 = bufferToBase64(photo.Photo);
        console.log(`   Base64 Preview: ${base64?.substring(0, 80)}...`);
      }
    });

    // Fetch employee photos
    console.log('\n\n👥 EMPLOYEE PHOTOS (Top 5)\n');
    const employeePhotos = await fetchEmployeePhotos();

    employeePhotos.forEach((photo, index) => {
      console.log(`\n${index + 1}. ${photo.FullName}`);
      console.log(`   ID: ${photo.PersonID}`);
      console.log(`   Email: ${photo.EmailAddress}`);
      console.log(`   Is Employee: ${photo.IsEmployee}`);
      console.log(`   Photo Size: ${photo.PhotoSizeKB} KB`);
      if (photo.Photo) {
        const base64 = bufferToBase64(photo.Photo);
        console.log(`   Base64 Preview: ${base64?.substring(0, 80)}...`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Photo data retrieval completed!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the main function
main();
