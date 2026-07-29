/**
 * Bellwether SWE - Plumbing E-Commerce Sample Data
 * 
 * This file provides comprehensive sample data for the plumbing e-commerce platform.
 * Use this for preview deployment with realistic plumbing products.
 * 
 * To use: Copy relevant products to seed.ts or import via catalog-import.ts
 */

export const plumbingCategories = [
  { slug: 'pipes-fittings', name: 'Pipes & Fittings', description: 'Complete range of pipes and pipe fittings' },
  { slug: 'pvc-pipes', name: 'PVC Pipes', description: 'PVC pipes for drainage and supply' },
  { slug: 'copper-pipes', name: 'Copper Pipes', description: 'Copper pipes and tubes' },
  { slug: 'brassware', name: 'Brassware', description: 'Brass taps, valves and fittings' },
  { slug: 'taps-faucets', name: 'Taps & Faucets', description: 'Kitchen and bathroom taps' },
  { slug: 'stopcocks', name: 'Stopcocks', description: 'Water stopcocks and isolation valves' },
  { slug: 'valves', name: 'Valves', description: 'Ball valves, gate valves and control valves' },
  { slug: 'bathroom', name: 'Bathroom Suite', description: 'Full bathroom suites and components' },
  { slug: 'basins', name: 'Basins & Sinks', description: 'Kitchen and bathroom basins' },
  { slug: 'toilets', name: 'Toilets & Cisterns', description: 'Toilets, cisterns and flushing systems' },
  { slug: 'baths', name: 'Baths & Spas', description: 'Baths, spa baths and accessories' },
  { slug: 'showers', name: 'Showers', description: 'Shower heads, cubicles and systems' },
  { slug: 'water-heating', name: 'Water Heating', description: 'Geysers, solar heaters and heat pumps' },
  { slug: 'geysers', name: 'Geysers', description: 'Electric and solar geysers' },
  { slug: 'solar-heaters', name: 'Solar Water Heaters', description: 'Solar geyser systems' },
  { slug: 'drainage', name: 'Drainage', description: 'Drainage solutions and accessories' },
  { slug: 'traps-grates', name: 'Traps & Grates', description: 'Floor traps and waste grates' },
  { slug: 'tools-equipment', name: 'Tools & Equipment', description: 'Professional plumbing tools' },
  { slug: 'pipe-tools', name: 'Pipe Tools', description: 'Pipe cutters, benders and joiners' },
  { slug: 'commercial', name: 'Commercial', description: 'Commercial and industrial plumbing' },
];

export const plumbingProducts = [
  // PVC Pipes
  {
    sku: 'BSWE-PVC-110-6M',
    slug: '110mm-pvc-pipe-6m',
    name: '110mm PVC Pipe - 6m Length',
    description: 'Heavy-duty 110mm PVC pipe for soil and waste drainage. SABS approved.',
    categorySlug: 'pvc-pipes',
    retailPrice: 289,
    tradePrice: 235,
    stockQty: 500,
    sansCompliant: true,
    attributes: { size: '110mm', length: '6m', type: 'Soil & Waste' }
  },
  {
    sku: 'BSWE-PVC-50-6M',
    slug: '50mm-pvc-pipe-6m',
    name: '50mm PVC Pipe - 6m Length',
    description: 'Standard 50mm PVC pipe for waste water drainage. SABS approved.',
    categorySlug: 'pvc-pipes',
    retailPrice: 145,
    tradePrice: 118,
    stockQty: 800,
    sansCompliant: true,
    attributes: { size: '50mm', length: '6m', type: 'Waste Water' }
  },
  
  // Copper Pipes
  {
    sku: 'BSWE-COP-22-3M',
    slug: '22mm-copper-pipe-3m',
    name: '22mm Copper Pipe - 3m Length',
    description: 'Type B 22mm copper pipe for hot and cold water supply.',
    categorySlug: 'copper-pipes',
    retailPrice: 425,
    tradePrice: 345,
    stockQty: 300,
    sansCompliant: true,
    attributes: { size: '22mm', length: '3m', type: 'Type B' }
  },
  {
    sku: 'BSWE-COP-15-3M',
    slug: '15mm-copper-pipe-3m',
    name: '15mm Copper Pipe - 3m Length',
    description: 'Type B 15mm copper pipe for hot and cold water supply.',
    categorySlug: 'copper-pipes',
    retailPrice: 285,
    tradePrice: 232,
    stockQty: 450,
    sansCompliant: true,
    attributes: { size: '15mm', length: '3m', type: 'Type B' }
  },
  
  // Brassware
  {
    sku: 'BSWE-BRS-ELB-22',
    slug: '22mm-copper-elbow',
    name: '22mm Copper Elbow 90°',
    description: 'Standard 22mm copper elbow fitting for domestic supply lines.',
    categorySlug: 'brassware',
    retailPrice: 48.9,
    tradePrice: 39.5,
    stockQty: 240,
    sansCompliant: true,
    attributes: { size: '22mm', angle: '90°', material: 'Copper' }
  },
  {
    sku: 'BSWE-BRS-CON-22',
    slug: '22mm-copper-coupling',
    name: '22mm Copper Straight Coupling',
    description: '22mm copper coupling for joining copper pipes.',
    categorySlug: 'brassware',
    retailPrice: 35,
    tradePrice: 28,
    stockQty: 350,
    sansCompliant: true,
    attributes: { size: '22mm', type: 'Straight' }
  },
  
  // Taps & Faucets
  {
    sku: 'BSWE-TAP-KIT-BLK',
    slug: 'kitchen-tap-matte-black',
    name: 'Kitchen Tap - Matte Black',
    description: 'Modern single-lever kitchen tap in matte black finish. Ceramic disc cartridge.',
    categorySlug: 'taps-faucets',
    retailPrice: 1850,
    tradePrice: 1480,
    stockQty: 45,
    sansCompliant: true,
    attributes: { finish: 'Matte Black', type: 'Single Lever', mount: 'Deck Mount' }
  },
  {
    sku: 'BSWE-TAP-BAS-CHR',
    slug: 'basin-tap-chrome',
    name: 'Basin Tap - Chrome',
    description: 'Classic chrome basin tap with pop-up waste. WRAS approved.',
    categorySlug: 'taps-faucets',
    retailPrice: 425,
    tradePrice: 340,
    stockQty: 120,
    sansCompliant: true,
    attributes: { finish: 'Chrome', type: 'Pillar Tap', waste: 'Pop-up' }
  },
  {
    sku: 'BSWE-TAP-SHWR-CHR',
    slug: 'bath-shower-mixer-chrome',
    name: 'Bath/Shower Mixer - Chrome',
    description: 'Deck-mounted bath and shower mixer with diverter. Brass body.',
    categorySlug: 'taps-faucets',
    retailPrice: 1650,
    tradePrice: 1320,
    stockQty: 65,
    sansCompliant: true,
    attributes: { finish: 'Chrome', type: 'Bath/Shower', mount: 'Deck Mount' }
  },
  
  // Stopcocks
  {
    sku: 'BSWE-STP-15-BRS',
    slug: '15mm-brass-stopcock',
    name: '15mm Brass Stopcock',
    description: '15mm brass isolation stopcock with lever handle. Full bore.',
    categorySlug: 'stopcocks',
    retailPrice: 185,
    tradePrice: 148,
    stockQty: 200,
    sansCompliant: true,
    attributes: { size: '15mm', material: 'Brass', handle: 'Lever' }
  },
  {
    sku: 'BSWE-STP-22-BRS',
    slug: '22mm-brass-stopcock',
    name: '22mm Brass Stopcock',
    description: '22mm brass isolation stopcock with lever handle. Full bore.',
    categorySlug: 'stopcocks',
    retailPrice: 245,
    tradePrice: 196,
    stockQty: 180,
    sansCompliant: true,
    attributes: { size: '22mm', material: 'Brass', handle: 'Lever' }
  },
  
  // Valves
  {
    sku: 'BSWE-VLV-50-BRS',
    slug: '50mm-brass-ball-valve',
    name: '50mm Brass Ball Valve - Full Port',
    description: 'Full-port brass ball valve rated for industrial process water lines up to 16 bar.',
    categorySlug: 'valves',
    retailPrice: 620,
    tradePrice: 510,
    stockQty: 60,
    sansCompliant: true,
    attributes: { size: '50mm', type: 'Ball Valve', pressure: '16 bar' }
  },
  {
    sku: 'BSWE-VLV-GAT-110',
    slug: '110mm-gate-valve',
    name: '110mm PVC Gate Valve',
    description: '110mm PVC gate valve for drainage applications. SABS approved.',
    categorySlug: 'valves',
    retailPrice: 895,
    tradePrice: 720,
    stockQty: 40,
    sansCompliant: true,
    attributes: { size: '110mm', type: 'Gate Valve', material: 'PVC' }
  },
  
  // Basins
  {
    sku: 'BSWE-BAS-PED-WHT',
    slug: 'pedestal-basin-white',
    name: 'Pedestal Basin - White',
    description: 'Full pedestal wash basin in glossy white. Single tap hole.',
    categorySlug: 'basins',
    retailPrice: 2450,
    tradePrice: 1960,
    stockQty: 25,
    sansCompliant: true,
    attributes: { type: 'Pedestal', color: 'White', tapHoles: 1, dimensions: '560x460mm' }
  },
  {
    sku: 'BSWE-BAS-KIT-SST',
    slug: 'kitchen-sink-stainless',
    name: 'Kitchen Sink - Stainless Steel 860x500',
    description: 'Single bowl stainless steel kitchen sink with drainer. 0.8mm steel.',
    categorySlug: 'basins',
    retailPrice: 1850,
    tradePrice: 1480,
    stockQty: 35,
    sansCompliant: true,
    attributes: { type: 'Kitchen', material: 'Stainless Steel', dimensions: '860x500mm', bowl: 1 }
  },
  
  // Toilets
  {
    sku: 'BSWE-TOI-CLS-WHT',
    slug: 'close-coupled-toilet-white',
    name: 'Close-Coupled Toilet Suite - White',
    description: 'Complete close-coupled toilet suite with soft-close seat. Dual flush 3/6L.',
    categorySlug: 'toilets',
    retailPrice: 3850,
    tradePrice: 3080,
    stockQty: 30,
    sansCompliant: true,
    attributes: { type: 'Close Coupled', flush: 'Dual 3/6L', seat: 'Soft Close', color: 'White' }
  },
  {
    sku: 'BSWE-TOI-WALL-WHT',
    slug: 'wall-hung-toilet-white',
    name: 'Wall-Hung Toilet - White',
    description: 'Wall-hung toilet pan with slim seat. Requires concealed cistern.',
    categorySlug: 'toilets',
    retailPrice: 2650,
    tradePrice: 2120,
    stockQty: 20,
    sansCompliant: true,
    attributes: { type: 'Wall Hung', seat: 'Not Included', color: 'White' }
  },
  
  // Baths
  {
    sku: 'BSWE-BTH-STD-WHT',
    slug: 'standard-bath-1700-white',
    name: 'Standard Bath - 1700x700 White',
    description: 'acrylic bathroom bath 1700x700mm. Single person, no armrests.',
    categorySlug: 'baths',
    retailPrice: 4200,
    tradePrice: 3360,
    stockQty: 15,
    sansCompliant: true,
    attributes: { dimensions: '1700x700mm', material: 'Acrylic', type: 'Standard' }
  },
  {
    sku: 'BSWE-BTH-CRN-WHT',
    slug: 'corner-bath-1500-white',
    name: 'Corner Bath - 1500x1500 White',
    description: 'Space-saving corner acrylic bath with jacuzzi jets. 1500x1500mm.',
    categorySlug: 'baths',
    retailPrice: 12500,
    tradePrice: 10000,
    stockQty: 5,
    sansCompliant: true,
    attributes: { dimensions: '1500x1500mm', material: 'Acrylic', jets: true }
  },
  
  // Showers
  {
    sku: 'BSWE-SHW-HND-CHR',
    slug: 'hand-shower-chrome',
    name: 'Hand Shower Set - Chrome',
    description: 'Complete hand shower set with 1.5m hose and wall bracket.',
    categorySlug: 'showers',
    retailPrice: 485,
    tradePrice: 388,
    stockQty: 150,
    sansCompliant: true,
    attributes: { type: 'Hand Shower', finish: 'Chrome', hose: '1.5m' }
  },
  {
    sku: 'BSWE-SHW-RNL-CHR',
    slug: 'rain-shower-head-chrome',
    name: 'Rain Shower Head - 300mm Chrome',
    description: '300mm ceiling-mounted rain shower head in chrome finish.',
    categorySlug: 'showers',
    retailPrice: 1850,
    tradePrice: 1480,
    stockQty: 40,
    sansCompliant: true,
    attributes: { type: 'Rain Head', size: '300mm', finish: 'Chrome', mount: 'Ceiling' }
  },
  
  // Geysers
  {
    sku: 'BSWE-GEY-150-ELE',
    slug: 'geyser-150l-electric',
    name: 'Electric Geyser - 150L',
    description: '150L vertical electric geyser with twin element. 2 year warranty.',
    categorySlug: 'geysers',
    retailPrice: 6850,
    tradePrice: 5480,
    stockQty: 20,
    sansCompliant: true,
    attributes: { capacity: '150L', type: 'Electric', elements: 2, orientation: 'Vertical' }
  },
  {
    sku: 'BSWE-GEY-200-SOL',
    slug: 'solar-geyser-200l',
    name: 'Solar Geyser System - 200L',
    description: 'Complete solar geyser with 30-tube collector. Includes pump station.',
    categorySlug: 'solar-heaters',
    retailPrice: 18500,
    tradePrice: 14800,
    stockQty: 8,
    sansCompliant: true,
    attributes: { capacity: '200L', type: 'Solar', tubes: 30, collector: 'Evacuated Tube' }
  },
  
  // Drainage
  {
    sku: 'BSWE-DRN-FLR-110',
    slug: '110mm-floor-trap',
    name: '110mm Floor Trap with Grate',
    description: '110mm PVC floor trap with stainless steel grate. P-trap design.',
    categorySlug: 'traps-grates',
    retailPrice: 185,
    tradePrice: 148,
    stockQty: 300,
    sansCompliant: true,
    attributes: { size: '110mm', type: 'P-Trap', grate: 'Stainless Steel' }
  },
  {
    sku: 'BSWE-DRN-WST-50',
    slug: '50mm-bottle-trap',
    name: '50mm Bottle Trap - Chrome',
    description: 'Chrome bottle trap for basin waste. 32/40/50mm adjustable.',
    categorySlug: 'traps-grates',
    retailPrice: 245,
    tradePrice: 196,
    stockQty: 200,
    sansCompliant: true,
    attributes: { size: '50mm', finish: 'Chrome', type: 'Bottle Trap' }
  },
  
  // Tools
  {
    sku: 'BSWE-TLS-PRO-24',
    slug: 'pro-plumbing-tool-set-24pc',
    name: 'Pro Plumbing Tool Set (24pc)',
    description: 'Professional 24-piece plumbing tool set. Includes wrenches, cutters and gauges.',
    categorySlug: 'tools-equipment',
    retailPrice: 1240,
    tradePrice: 995,
    stockQty: 35,
    sansCompliant: false,
    attributes: { pieces: 24, type: 'Professional', case: 'Carry Bag' }
  },
  {
    sku: 'BSWE-TLS-PVC-CTR',
    slug: 'pvc-pipe-cutter',
    name: 'PVC Pipe Cutter - 42mm',
    description: 'Ratchet-action PVC pipe cutter for pipes up to 42mm.',
    categorySlug: 'pipe-tools',
    retailPrice: 485,
    tradePrice: 388,
    stockQty: 80,
    sansCompliant: false,
    attributes: { capacity: '42mm', type: 'Ratchet', blade: 'Replaceable' }
  },
];

export const plumbingBundles = [
  {
    slug: 'bathroom-renovation-kit',
    name: 'Bathroom Renovation Starter Kit',
    description: 'Everything needed for a basic bathroom renovation. Basin, toilet, taps, and fittings.',
    sector: 'Residential',
    bundlePrice: 15000,
    products: [
      { sku: 'BSWE-BAS-PED-WHT', quantity: 1 },
      { sku: 'BSWE-TOI-CLS-WHT', quantity: 1 },
      { sku: 'BSWE-TAP-BAS-CHR', quantity: 1 },
      { sku: 'BSWE-BRS-ELB-22', quantity: 4 },
      { sku: 'BSWE-STP-15-BRS', quantity: 2 },
    ]
  },
  {
    slug: 'kitchen-plumbing-kit',
    name: 'Kitchen Plumbing Kit',
    description: 'Complete kitchen sink installation kit with all fittings.',
    sector: 'Residential',
    bundlePrice: 4500,
    products: [
      { sku: 'BSWE-BAS-KIT-SST', quantity: 1 },
      { sku: 'BSWE-TAP-KIT-BLK', quantity: 1 },
      { sku: 'BSWE-DRN-WST-50', quantity: 1 },
      { sku: 'BSWE-BRS-CON-22', quantity: 2 },
    ]
  },
  {
    slug: 'drainage-100m-kit',
    name: '100m Drainage Kit',
    description: 'Complete 100m underground drainage system with all pipes and fittings.',
    sector: 'Civil',
    bundlePrice: 25000,
    products: [
      { sku: 'BSWE-PVC-110-6M', quantity: 17 },
      { sku: 'BSWE-DRN-FLR-110', quantity: 3 },
      { sku: 'BSWE-VLV-GAT-110', quantity: 2 },
    ]
  },
];

export const serviceCategories = [
  { code: 'RESIDENTIAL', label: 'Residential' },
  { code: 'COMMERCIAL', label: 'Commercial' },
  { code: 'INDUSTRIAL', label: 'Industrial' },
  { code: 'CIVIL', label: 'Civil' },
];

export const complexityMultipliers = [
  { code: 'AFTER_HOURS', label: 'After-Hours Callout', multiplier: 1.5 },
  { code: 'MULTI_STOREY', label: 'Multi-Storey Access', multiplier: 1.25 },
  { code: 'WEEKEND', label: 'Weekend Work', multiplier: 1.3 },
  { code: 'EMERGENCY', label: 'Emergency Response', multiplier: 2.0 },
  { code: 'CONFINED_SPACE', label: 'Confined Space Work', multiplier: 1.4 },
];
