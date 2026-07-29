import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Deliberately small and hand-curated, not a bulk generator — the point is
// a coherent, demoable dataset that exercises every module (categories,
// products, bundles, price book, multipliers), not catalog-scale volume.
// A separate bulk-import script is a real future need once there's an
// actual 10,500-SKU feed to load; this isn't trying to be that.
async function main(): Promise<void> {
  console.log('Seeding...');

  const pipesCategory = await prisma.category.upsert({
    where: { slug: 'pipes-fittings' },
    update: {},
    create: { slug: 'pipes-fittings', name: 'Pipes & Fittings' },
  });
  const valvesCategory = await prisma.category.upsert({
    where: { slug: 'valves-backflow' },
    update: {},
    create: { slug: 'valves-backflow', name: 'Valves & Backflow' },
  });
  const toolsCategory = await prisma.category.upsert({
    where: { slug: 'tools-equipment' },
    update: {},
    create: { slug: 'tools-equipment', name: 'Tools & Equipment' },
  });

  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'BSWE-PIP-22CU-014' },
      update: {},
      create: {
        sku: 'BSWE-PIP-22CU-014',
        slug: '22mm-copper-elbow-coupling',
        name: '22mm Copper Elbow Coupling',
        description: 'Standard 22mm copper elbow coupling for domestic supply lines.',
        categoryId: pipesCategory.id,
        retailPrice: 48.9,
        tradePrice: 39.5,
        stockQty: 240,
        sansCompliant: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BSWE-VLV-50BR-002' },
      update: {},
      create: {
        sku: 'BSWE-VLV-50BR-002',
        slug: '50mm-industrial-ball-valve',
        name: '50mm Industrial Ball Valve — Brass, Full Port',
        description: 'Full-port brass ball valve rated for industrial process water lines up to 16 bar.',
        categoryId: valvesCategory.id,
        retailPrice: 620,
        tradePrice: 510,
        stockQty: 60,
        sansCompliant: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BSWE-VLV-50BSP-003' },
      update: {},
      create: {
        sku: 'BSWE-VLV-50BSP-003',
        slug: '50mm-bsp-coupling',
        name: '50mm BSP Coupling',
        categoryId: pipesCategory.id,
        retailPrice: 95,
        tradePrice: 76,
        stockQty: 150,
        sansCompliant: true,
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BSWE-TLS-PRO24' },
      update: {},
      create: {
        sku: 'BSWE-TLS-PRO24',
        slug: 'pro-plumbing-tool-set-24pc',
        name: 'Pro Plumbing Tool Set (24pc)',
        categoryId: toolsCategory.id,
        retailPrice: 1240,
        tradePrice: 995,
        stockQty: 35,
        sansCompliant: false,
      },
    }),
  ]);

  const [copperElbow, ballValve, bspCoupling] = products;

  // Gives recommendation_service.py's co-occurrence query something real to
  // find — see apps/ai-service/app/services/recommendation_service.py.
  await prisma.bundle.upsert({
    where: { slug: 'backflow-prevention-kit' },
    update: {},
    create: {
      slug: 'backflow-prevention-kit',
      name: 'Backflow Prevention Kit',
      description: 'Certified backflow assembly for process water lines.',
      sector: 'Industrial',
      bundlePrice: 9860,
      items: {
        create: [
          { productId: ballValve.id, quantity: 1 },
          { productId: bspCoupling.id, quantity: 2 },
        ],
      },
    },
  });

  // Complexity multiplier codes referenced by estimate_service.py's
  // classification rules — without these, /estimate's quote calls fail with
  // "Unknown complexity multiplier code(s)" for any description that
  // matches AFTER_HOURS or MULTI_STOREY.
  await Promise.all([
    prisma.complexityMultiplier.upsert({
      where: { code: 'AFTER_HOURS' },
      update: {},
      create: { code: 'AFTER_HOURS', label: 'After-Hours Callout', multiplier: 1.5 },
    }),
    prisma.complexityMultiplier.upsert({
      where: { code: 'MULTI_STOREY' },
      update: {},
      create: { code: 'MULTI_STOREY', label: 'Multi-Storey Access', multiplier: 1.25 },
    }),
  ]);

  // Price book entries for every (sector, serviceCode) pair the AI service's
  // estimate_service.py can classify a description into, including the
  // GENERAL_CALLOUT fallback — without this row specifically, any
  // description matching none of the keyword rules would get a "low
  // confidence" classification and then fail at the pricing step too.
  const priceBookRows: { sector: string; serviceCode: string; baseLaborRate: number; unit: string }[] = [
    { sector: 'Residential', serviceCode: 'PIPE_REPAIR', baseLaborRate: 450, unit: 'per_fixture' },
    { sector: 'Residential', serviceCode: 'DRAIN_CLEARING', baseLaborRate: 520, unit: 'per_fixture' },
    { sector: 'Residential', serviceCode: 'WATER_HEATING_INSTALL', baseLaborRate: 1850, unit: 'per_fixture' },
    { sector: 'Residential', serviceCode: 'GENERAL_CALLOUT', baseLaborRate: 350, unit: 'per_hour' },
    { sector: 'Industrial', serviceCode: 'BACKFLOW_PREVENTION', baseLaborRate: 2400, unit: 'per_fixture' },
    { sector: 'Commercial', serviceCode: 'BOOSTER_PUMP_INSTALL', baseLaborRate: 3200, unit: 'per_fixture' },
    { sector: 'Civil', serviceCode: 'TRENCHING_CIVIL', baseLaborRate: 180, unit: 'per_meter' },
  ];
  await Promise.all(
    priceBookRows.map((row) =>
      prisma.priceBookEntry.create({ data: row }).catch(() => {
        // No unique constraint on (sector, serviceCode) to upsert against by
        // design (see schema.prisma — effectiveFrom supports multiple
        // historical rates) — re-running the seed script intentionally adds
        // a new rate row rather than overwriting, so a duplicate here is
        // expected on a second run, not an error worth failing the script over.
      }),
    ),
  );

  console.log(`Seeded ${products.length} products, 1 bundle, 2 multipliers, ${priceBookRows.length} price book entries.`);
  console.log(`Sample product for manual testing: ${copperElbow.slug}`);

  // A demo account + completed booking — without this, there's no way to
  // locally exercise WarrantyService.issue or ComplianceService.issue
  // (both require a real InstallationBooking row, and a booking requires a
  // real Account). keycloakSub is a fake subject, not a real Keycloak
  // identity — fine for local testing, but this account can never actually
  // log in through the real auth flow, only be queried/booked-against
  // directly.
  const demoAccount = await prisma.account.upsert({
    where: { keycloakSub: 'seed-demo-account' },
    update: {},
    create: { keycloakSub: 'seed-demo-account', email: 'demo@bellwetherswe.co.za' },
  });
  const demoBooking = await prisma.installationBooking.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      accountId: demoAccount.id,
      sector: 'Residential',
      serviceCode: 'PIPE_REPAIR',
      status: 'COMPLETED',
      siteAddress: '12 Demo Street, Durban',
    },
  });
  console.log(`Seeded a demo account (${demoAccount.email}) with a COMPLETED booking (${demoBooking.id}) for testing warranty/compliance issuance.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
