import { prisma } from '../lib/prisma';
import fs from 'fs';
import { parse } from 'csv-parse';

const SEBI_CSV = process.env.SEBI_REGISTRY_CSV || '/data/SEBI_REGISTERED_ADVISORS.csv';
const NSE_CSV = process.env.NSE_COMPANIES_CSV || '/data/NSE_COMPANIES.csv';
const BSE_CSV = process.env.BSE_COMPANIES_CSV || '/data/BSE_COMPANIES.csv';

async function importSebiRegistry() {
  if (!fs.existsSync(SEBI_CSV)) {
    console.error('SEBI CSV not found at', SEBI_CSV);
    return;
  }

  console.log('Importing SEBI registry from:', SEBI_CSV);
  const parser = fs.createReadStream(SEBI_CSV).pipe(parse({ columns: true, trim: true }));
  let count = 0;

  for await (const record of parser) {
    try {
      // Handle different possible column names in SEBI data
      const reg_no = record['Registration Number'] || record['Reg No'] || record['RegNo'] || record['reg_no'];
      const entity_name = (
        record['Name of the Entity'] || 
        record['Entity Name'] || 
        record['NAME'] || 
        record['entity_name'] || 
        ''
      ).toUpperCase().trim();

      if (!reg_no || !entity_name) {
        console.warn('Skipping record with missing reg_no or entity_name:', record);
        continue;
      }

      // Extract other fields that might be present
      const category = record['Category'] || record['Type'] || record['category'] || null;
      const contact_email = record['Email'] || record['Contact Email'] || record['email'] || null;
      const contact_phone = record['Phone'] || record['Contact Phone'] || record['phone'] || null;
      const valid_from = record['Valid From'] || record['Registration Date'] || null;
      const valid_to = record['Valid To'] || record['Expiry Date'] || null;

      await prisma.sebiRegistry.upsert({
        where: { reg_no },
        update: {
          entity_name,
          category,
          contact_email,
          contact_phone,
          valid_from: valid_from ? new Date(valid_from) : null,
          valid_to: valid_to ? new Date(valid_to) : null,
          raw: record
        },
        create: {
          reg_no,
          entity_name,
          category,
          contact_email,
          contact_phone,
          valid_from: valid_from ? new Date(valid_from) : null,
          valid_to: valid_to ? new Date(valid_to) : null,
          raw: record
        }
      });

      count++;
      if (count % 100 === 0) {
        console.log(`Imported ${count} SEBI records...`);
      }
    } catch (error) {
      console.error('Error importing SEBI record:', error, record);
    }
  }

  console.log(`Successfully imported ${count} SEBI registry records`);
}

async function importCompanyData() {
  // Import NSE companies
  if (fs.existsSync(NSE_CSV)) {
    console.log('Importing NSE companies from:', NSE_CSV);
    const parser = fs.createReadStream(NSE_CSV).pipe(parse({ columns: true, trim: true }));
    let count = 0;

    for await (const record of parser) {
      try {
        const symbol = record['SYMBOL'] || record['Symbol'] || record['symbol'];
        const company_name = (
          record['COMPANY NAME'] || 
          record['Company Name'] || 
          record['NAME OF COMPANY'] ||
          record['company_name'] ||
          ''
        ).toUpperCase().trim();

        if (!symbol || !company_name) continue;

        // Store in SEBI registry table as legitimate entities
        const reg_no = `NSE_${symbol}`;
        
        await prisma.sebiRegistry.upsert({
          where: { reg_no },
          update: {
            entity_name: company_name,
            category: 'NSE_LISTED',
            raw: record
          },
          create: {
            reg_no,
            entity_name: company_name,
            category: 'NSE_LISTED',
            raw: record
          }
        });

        count++;
      } catch (error) {
        console.error('Error importing NSE record:', error);
      }
    }
    console.log(`Imported ${count} NSE companies`);
  }

  // Import BSE companies
  if (fs.existsSync(BSE_CSV)) {
    console.log('Importing BSE companies from:', BSE_CSV);
    const parser = fs.createReadStream(BSE_CSV).pipe(parse({ columns: true, trim: true }));
    let count = 0;

    for await (const record of parser) {
      try {
        const security_code = record['Security Code'] || record['Scrip Code'] || record['security_code'];
        const security_name = (
          record['Security Name'] || 
          record['Company Name'] || 
          record['COMPANY NAME'] ||
          record['security_name'] ||
          ''
        ).toUpperCase().trim();

        if (!security_code || !security_name) continue;

        const reg_no = `BSE_${security_code}`;
        
        await prisma.sebiRegistry.upsert({
          where: { reg_no },
          update: {
            entity_name: security_name,
            category: 'BSE_LISTED',
            raw: record
          },
          create: {
            reg_no,
            entity_name: security_name,
            category: 'BSE_LISTED',
            raw: record
          }
        });

        count++;
      } catch (error) {
        console.error('Error importing BSE record:', error);
      }
    }
    console.log(`Imported ${count} BSE companies`);
  }
}

async function main() {
  try {
    console.log('Starting data import process...');
    
    await importSebiRegistry();
    await importCompanyData();
    
    console.log('Data import completed successfully!');
    
    // Print summary
    const totalRecords = await prisma.sebiRegistry.count();
    const sebiRecords = await prisma.sebiRegistry.count({
      where: { category: { notIn: ['NSE_LISTED', 'BSE_LISTED'] } }
    });
    const nseRecords = await prisma.sebiRegistry.count({
      where: { category: 'NSE_LISTED' }
    });
    const bseRecords = await prisma.sebiRegistry.count({
      where: { category: 'BSE_LISTED' }
    });
    
    console.log('\nImport Summary:');
    console.log(`Total records: ${totalRecords}`);
    console.log(`SEBI advisors: ${sebiRecords}`);
    console.log(`NSE companies: ${nseRecords}`);
    console.log(`BSE companies: ${bseRecords}`);
    
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
