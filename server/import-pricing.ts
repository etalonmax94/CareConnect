import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { pricingServices, type ServiceType } from '../shared/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import pricing data from EmpowerLink Services Excel file
 * Maps services from the Pricing sheet to the pricing_services table
 */
export async function importPricingFromExcel(filePath?: string): Promise<{ success: boolean; imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    // Default to the EmpowerLink Services file if no path provided
    const excelPath = filePath || path.join(__dirname, '..', 'attached_assets', 'NDIS - EmpowerLinkServices_1764110951129.xlsx');

    // Read the Excel file
    const workbook = XLSX.readFile(excelPath);

    // Get the Pricing sheet
    if (!workbook.SheetNames.includes('Pricing')) {
      return { success: false, imported: 0, errors: ['Pricing sheet not found in Excel file'] };
    }

    const worksheet = workbook.Sheets['Pricing'];
    const pricingData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(`Found ${pricingData.length} pricing records in Excel file`);

    // Map Excel data to database schema
    for (const row of pricingData as any[]) {
      const serviceName = row['Service Name']?.trim();
      const description = row['Description']?.trim();
      const unit = row['Unit']?.trim() || 'Hour';
      const price = row['Price (AUD)'];

      // Skip empty rows
      if (!serviceName || serviceName === 'N/A' || price === 0) {
        continue;
      }

      try {
        // Determine service type based on service name
        let serviceType: ServiceType = 'NDIS'; // Default to NDIS
        let category = 'General';

        // Categorize services
        if (serviceName.toLowerCase().includes('nursing') || serviceName.toLowerCase().includes('clinical')) {
          category = 'Nursing';
        } else if (serviceName.toLowerCase().includes('support')) {
          category = 'Support Work';
        } else if (serviceName.toLowerCase().includes('transport') || serviceName.toLowerCase().includes('travel')) {
          category = 'Transport';
        }

        // Determine rate type and create appropriate pricing record
        const rateMapping: Record<string, { weekday?: string; saturday?: string; sunday?: string; publicHoliday?: string; evening?: string; night?: string }> = {
          'Daytime': { weekday: price.toString() },
          'Evening': { evening: price.toString() },
          'Night': { night: price.toString() },
          'PH': { publicHoliday: price.toString() },
          'Saturday': { saturday: price.toString() },
          'Sunday': { sunday: price.toString() },
        };

        // Detect rate type from service name
        let rates = { weekday: '0', saturday: '0', sunday: '0', publicHoliday: '0', evening: '0', night: '0' };

        for (const [key, value] of Object.entries(rateMapping)) {
          if (serviceName.includes(key)) {
            rates = { ...rates, ...value };
            break;
          }
        }

        // If no specific rate type detected, use as weekday rate
        if (rates.weekday === '0' && rates.saturday === '0' && rates.sunday === '0') {
          rates.weekday = price.toString();
        }

        // Insert into database
        await db.insert(pricingServices).values({
          serviceType,
          serviceName,
          description,
          category,
          unit,
          weekdayRate: rates.weekday,
          saturdayRate: rates.saturday,
          sundayRate: rates.sunday,
          publicHolidayRate: rates.publicHoliday,
          eveningRate: rates.evening,
          nightRate: rates.night,
          includesGst: 'no', // NDIS services are GST-exempt
          isActive: 'yes',
          effectiveFrom: new Date().toISOString().split('T')[0],
        }).onConflictDoNothing();

        imported++;
        console.log(`✓ Imported: ${serviceName}`);
      } catch (error) {
        const errorMsg = `Failed to import "${serviceName}": ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  } catch (error) {
    const errorMsg = `Failed to read Excel file: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);
    return { success: false, imported: 0, errors };
  }
}

/**
 * Create comprehensive pricing services for all service types
 * This function creates a complete pricing catalog for NDIS, Support at Home, and Private services
 */
export async function createComprehensivePricingCatalog(): Promise<void> {
  const pricingCatalog = [
    // NDIS Nursing Services
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Registered Nurse - Weekday',
      description: 'Registered nursing care during standard weekday hours',
      category: 'Nursing',
      unit: 'Hour',
      weekdayRate: '123.65',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Registered Nurse - Saturday',
      description: 'Registered nursing care on Saturdays',
      category: 'Nursing',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '176.47',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Registered Nurse - Sunday',
      description: 'Registered nursing care on Sundays',
      category: 'Nursing',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '202.87',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Registered Nurse - Public Holiday',
      description: 'Registered nursing care on public holidays',
      category: 'Nursing',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '229.27',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Registered Nurse - Evening',
      description: 'Registered nursing care in the evening (after 6pm)',
      category: 'Nursing',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '136.41',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Registered Nurse - Night',
      description: 'Registered nursing care overnight (after 11pm)',
      category: 'Nursing',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '138.95',
      includesGst: 'no' as const,
    },
    // NDIS Support Work Services
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Support Worker - Weekday',
      description: 'Support work during standard weekday hours',
      category: 'Support Work',
      unit: 'Hour',
      weekdayRate: '70.23',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Support Worker - Saturday',
      description: 'Support work on Saturdays',
      category: 'Support Work',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '98.83',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Support Worker - Sunday',
      description: 'Support work on Sundays',
      category: 'Support Work',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '127.43',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Support Worker - Public Holiday',
      description: 'Support work on public holidays',
      category: 'Support Work',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '156.03',
      eveningRate: '0',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Support Worker - Evening',
      description: 'Support work in the evening (after 6pm)',
      category: 'Support Work',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '77.38',
      nightRate: '0',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Support Worker - Night (Active)',
      description: 'Active support work overnight',
      category: 'Support Work',
      unit: 'Hour',
      weekdayRate: '0',
      saturdayRate: '0',
      sundayRate: '0',
      publicHolidayRate: '0',
      eveningRate: '0',
      nightRate: '75.00',
      includesGst: 'no' as const,
    },
    // Transport
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Transport',
      description: 'Transport related to services',
      category: 'Transport',
      unit: 'Km',
      weekdayRate: '0.99',
      saturdayRate: '0.99',
      sundayRate: '0.99',
      publicHolidayRate: '0.99',
      eveningRate: '0.99',
      nightRate: '0.99',
      includesGst: 'no' as const,
    },
    {
      serviceType: 'NDIS' as ServiceType,
      serviceName: 'Provider Travel',
      description: 'Provider travel time',
      category: 'Transport',
      unit: 'Hour',
      weekdayRate: '70.23',
      saturdayRate: '98.83',
      sundayRate: '127.43',
      publicHolidayRate: '156.03',
      eveningRate: '77.38',
      nightRate: '75.00',
      includesGst: 'no' as const,
    },
  ];

  for (const service of pricingCatalog) {
    await db.insert(pricingServices).values({
      ...service,
      isActive: 'yes',
      effectiveFrom: new Date().toISOString().split('T')[0],
    }).onConflictDoNothing();
  }

  console.log(`✓ Created ${pricingCatalog.length} pricing services`);
}

// Run import if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting pricing import...');

  // First, create comprehensive catalog
  await createComprehensivePricingCatalog();

  // Then import from Excel if additional services exist
  const result = await importPricingFromExcel();

  console.log('\n=== Import Results ===');
  console.log(`Success: ${result.success}`);
  console.log(`Imported: ${result.imported} services`);
  if (result.errors.length > 0) {
    console.log(`Errors: ${result.errors.length}`);
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  process.exit(result.success ? 0 : 1);
}
