import * as sql from 'mssql';
import dotenv from 'dotenv';
import { getDefaultSqlConfig, connectToDatabase, closeConnection } from './utils/db';

dotenv.config();

interface Country {
  CountryID: number;
  CountryName: string;
  Continent: string;
  Region: string;
  Subregion: string;
}

interface City {
  CityID: number;
  CityName: string;
  StateProvinceName: string;
  StateProvinceCode: string;
  CountryName: string;
  LatestRecordedPopulation?: number;
}

interface CityCountByCountry {
  CountryName: string;
  CityCount: number;
}

(async (): Promise<void> => {
  let pool: sql.ConnectionPool | null = null;

  try {
    const sqlConfig = getDefaultSqlConfig();
    pool = await connectToDatabase(sqlConfig);
    console.log('Connected to database\n');

    // Get all countries
    console.log('=== ALL COUNTRIES ===\n');
    const countriesResult = await pool.request().query(`
      SELECT CountryID, CountryName, Continent, Region, Subregion
      FROM Application.Countries
      ORDER BY CountryName
    `);

    console.log(`Total countries: ${countriesResult.recordset.length}\n`);
    for (const country of countriesResult.recordset as Country[]) {
      console.log(
        `${country.CountryID.toString().padEnd(4)} | ${country.CountryName.padEnd(30)} | ${country.Continent.padEnd(20)} | ${country.Region.padEnd(25)} | ${country.Subregion}`
      );
    }

    // Get all cities with their state/country info
    console.log('\n\n=== ALL CITIES (with State/Country) ===\n');
    const citiesResult = await pool.request().query(`
      SELECT
        c.CityID,
        c.CityName,
        sp.StateProvinceName,
        sp.StateProvinceCode,
        co.CountryName,
        c.LatestRecordedPopulation
      FROM Application.Cities c
      INNER JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      INNER JOIN Application.Countries co ON sp.CountryID = co.CountryID
      ORDER BY co.CountryName, sp.StateProvinceName, c.CityName
    `);

    console.log(`Total cities: ${citiesResult.recordset.length}\n`);

    let lastCountry = '';
    let lastState = '';

    for (const city of citiesResult.recordset as City[]) {
      if (city.CountryName !== lastCountry) {
        console.log(`\n${city.CountryName}`);
        console.log('─'.repeat(80));
        lastCountry = city.CountryName;
        lastState = '';
      }

      if (city.StateProvinceName !== lastState) {
        console.log(`  ${city.StateProvinceName} (${city.StateProvinceCode})`);
        lastState = city.StateProvinceName;
      }

      const pop = city.LatestRecordedPopulation ? ` [Pop: ${city.LatestRecordedPopulation.toLocaleString()}]` : '';
      console.log(`    • ${city.CityName}${pop}`);
    }

    console.log('\n\n=== SUMMARY ===');

    // Get count by country
    const countByCountry = await pool.request().query(`
      SELECT
        co.CountryName,
        COUNT(DISTINCT c.CityID) as CityCount
      FROM Application.Cities c
      INNER JOIN Application.StateProvinces sp ON c.StateProvinceID = sp.StateProvinceID
      INNER JOIN Application.Countries co ON sp.CountryID = co.CountryID
      GROUP BY co.CountryName
      ORDER BY CityCount DESC
    `);

    console.log('\nCities per country:');
    for (const row of countByCountry.recordset as CityCountByCountry[]) {
      console.log(`  ${row.CountryName.padEnd(30)} : ${row.CityCount} cities`);
    }

    if (pool) {
      await closeConnection(pool);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('Error:', error);
    process.exit(1);
  }
})();
