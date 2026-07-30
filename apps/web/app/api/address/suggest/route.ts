import { NextResponse } from 'next/server';

// Force dynamic rendering - this route uses request params
export const dynamic = 'force-dynamic';

// Comprehensive South African address database for autocomplete
// This includes major suburbs, towns, and cities across all provinces
const SA_ADDRESSES = [
  // Gauteng
  { suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', postalCode: '2196' },
  { suburb: 'Rosebank', city: 'Johannesburg', province: 'Gauteng', postalCode: '2196' },
  { suburb: 'Midrand', city: 'Johannesburg', province: 'Gauteng', postalCode: '1685' },
  { suburb: 'Centurion', city: 'Pretoria', province: 'Gauteng', postalCode: '0157' },
  { suburb: 'Pretoria CBD', city: 'Pretoria', province: 'Gauteng', postalCode: '0002' },
  { suburb: 'Hatfield', city: 'Pretoria', province: 'Gauteng', postalCode: '0028' },
  { suburb: 'Menlyn', city: 'Pretoria', province: 'Gauteng', postalCode: '0181' },
  { suburb: 'Sunderland Ridge', city: 'Pretoria', province: 'Gauteng', postalCode: '0157' },
  { suburb: 'Johannesburg CBD', city: 'Johannesburg', province: 'Gauteng', postalCode: '2001' },
  { suburb: 'Braamfontein', city: 'Johannesburg', province: 'Gauteng', postalCode: '2017' },
  { suburb: 'Parktown', city: 'Johannesburg', province: 'Gauteng', postalCode: '2193' },
  { suburb: 'Melrose Arch', city: 'Johannesburg', province: 'Gauteng', postalCode: '2076' },
  { suburb: 'Fourways', city: 'Johannesburg', province: 'Gauteng', postalCode: '2055' },
  { suburb: 'Bryanston', city: 'Johannesburg', province: 'Gauteng', postalCode: '2021' },
  { suburb: 'Randburg', city: 'Johannesburg', province: 'Gauteng', postalCode: '2194' },
  { suburb: 'Alberton', city: 'Johannesburg', province: 'Gauteng', postalCode: '1449' },
  { suburb: 'Benoni', city: 'Johannesburg', province: 'Gauteng', postalCode: '1500' },
  { suburb: 'Boksburg', city: 'Johannesburg', province: 'Gauteng', postalCode: '1459' },
  { suburb: 'Kempton Park', city: 'Johannesburg', province: 'Gauteng', postalCode: '1620' },
  { suburb: 'Germiston', city: 'Johannesburg', province: 'Gauteng', postalCode: '1400' },
  { suburb: 'Roodepoort', city: 'Johannesburg', province: 'Gauteng', postalCode: '1724' },
  { suburb: 'Krugersdorp', city: 'Johannesburg', province: 'Gauteng', postalCode: '1739' },
  { suburb: 'Soweto', city: 'Johannesburg', province: 'Gauteng', postalCode: '1804' },
  { suburb: 'Alexandra', city: 'Johannesburg', province: 'Gauteng', postalCode: '2090' },
  { suburb: 'Tembisa', city: 'Johannesburg', province: 'Gauteng', postalCode: '1632' },
  { suburb: 'Diepsloot', city: 'Johannesburg', province: 'Gauteng', postalCode: '0182' },
  { suburb: 'Mabopane', city: 'Pretoria', province: 'Gauteng', postalCode: '0190' },
  { suburb: 'Soshanguve', city: 'Pretoria', province: 'Gauteng', postalCode: '0152' },
  { suburb: 'Atteridgeville', city: 'Pretoria', province: 'Gauteng', postalCode: '0008' },
  { suburb: 'Laudium', city: 'Pretoria', province: 'Gauteng', postalCode: '0037' },
  { suburb: 'Hammanskraal', city: 'Pretoria', province: 'Gauteng', postalCode: '0400' },
  { suburb: 'Mamelodi', city: 'Pretoria', province: 'Gauteng', postalCode: '0122' },
  { suburb: 'Ekurhuleni', city: 'East Rand', province: 'Gauteng', postalCode: '1459' },
  { suburb: 'Vanderbijlpark', city: 'Vereeniging', province: 'Gauteng', postalCode: '1911' },
  { suburb: 'Vereeniging', city: 'Vereeniging', province: 'Gauteng', postalCode: '1930' },
  { suburb: 'Koserand', city: 'Benoni', province: 'Gauteng', postalCode: '1501' },

  // Western Cape
  { suburb: 'Cape Town CBD', city: 'Cape Town', province: 'Western Cape', postalCode: '8000' },
  { suburb: 'Sea Point', city: 'Cape Town', province: 'Western Cape', postalCode: '8005' },
  { suburb: 'Green Point', city: 'Cape Town', province: 'Western Cape', postalCode: '8005' },
  { suburb: 'Waterfront', city: 'Cape Town', province: 'Western Cape', postalCode: '8002' },
  { suburb: 'Gardens', city: 'Cape Town', province: 'Western Cape', postalCode: '8001' },
  { suburb: 'Observatory', city: 'Cape Town', province: 'Western Cape', postalCode: '7925' },
  { suburb: 'University Estate', city: 'Cape Town', province: 'Western Cape', postalCode: '7700' },
  { suburb: 'Muizenberg', city: 'Cape Town', province: 'Western Cape', postalCode: '7945' },
  { suburb: 'Simon\'s Town', city: 'Cape Town', province: 'Western Cape', postalCode: '7975' },
  { suburb: 'Constantia', city: 'Cape Town', province: 'Western Cape', postalCode: '7848' },
  { suburb: 'Tokai', city: 'Cape Town', province: 'Western Cape', postalCode: '7966' },
  { suburb: 'Stellenbosch', city: 'Stellenbosch', province: 'Western Cape', postalCode: '7600' },
  { suburb: 'Paarl', city: 'Paarl', province: 'Western Cape', postalCode: '7646' },
  { suburb: 'Franschhoek', city: 'Franschhoek', province: 'Western Cape', postalCode: '7690' },
  { suburb: 'Somerset West', city: 'Somerset West', province: 'Western Cape', postalCode: '7130' },
  { suburb: 'Strand', city: 'Somerset West', province: 'Western Cape', postalCode: '7140' },
  { suburb: 'Bellville', city: 'Cape Town', province: 'Western Cape', postalCode: '7530' },
  { suburb: 'Durbanville', city: 'Cape Town', province: 'Western Cape', postalCode: '7550' },
  { suburb: 'Tyger Valley', city: 'Cape Town', province: 'Western Cape', postalCode: '7536' },
  { suburb: 'Brackenfell', city: 'Cape Town', province: 'Western Cape', postalCode: '7560' },
  { suburb: 'Kraaifontein', city: 'Cape Town', province: 'Western Cape', postalCode: '7570' },
  { suburb: 'Kuils River', city: 'Cape Town', province: 'Western Cape', postalCode: '7580' },
  { suburb: 'Mitchells Plain', city: 'Cape Town', province: 'Western Cape', postalCode: '7785' },
  { suburb: 'Khayelitsha', city: 'Cape Town', province: 'Western Cape', postalCode: '7784' },
  { suburb: 'Wellington', city: 'Wellington', province: 'Western Cape', postalCode: '7655' },
  { suburb: 'Malmesbury', city: 'Malmesbury', province: 'Western Cape', postalCode: '7299' },
  { suburb: 'Montagu', city: 'Montagu', province: 'Western Cape', postalCode: '6720' },
  { suburb: 'George', city: 'George', province: 'Western Cape', postalCode: '6529' },
  { suburb: 'Mossel Bay', city: 'Mossel Bay', province: 'Western Cape', postalCode: '6506' },
  { suburb: 'Oudtshoorn', city: 'Oudtshoorn', province: 'Western Cape', postalCode: '6625' },
  { suburb: 'Knysna', city: 'Knysna', province: 'Western Cape', postalCode: '6570' },
  { suburb: 'Plettenberg Bay', city: 'Plettenberg Bay', province: 'Western Cape', postalCode: '6600' },
  { suburb: 'Hermanus', city: 'Hermanus', province: 'Western Cape', postalCode: '7200' },
  { suburb: 'Caledon', city: 'Caledon', province: 'Western Cape', postalCode: '7230' },
  { suburb: 'Bredasdorp', city: 'Bredasdorp', province: 'Western Cape', postalCode: '7280' },
  { suburb: 'Worcester', city: 'Worcester', province: 'Western Cape', postalCode: '6850' },
  { suburb: 'Robertson', city: 'Robertson', province: 'Western Cape', postalCode: '6705' },

  // KwaZulu-Natal
  { suburb: 'Durban CBD', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4001' },
  { suburb: 'Umhlanga', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4319' },
  { suburb: 'La Lucia', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4051' },
  { suburb: 'Umdloti', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4355' },
  { suburb: 'Ballito', city: 'Ballito', province: 'KwaZulu-Natal', postalCode: '4399' },
  { suburb: 'Zimbali', city: 'Ballito', province: 'KwaZulu-Natal', postalCode: '4398' },
  { suburb: 'Salt Rock', city: 'Ballito', province: 'KwaZulu-Natal', postalCode: '4391' },
  { suburb: 'Shakas Rock', city: 'Ballito', province: 'KwaZulu-Natal', postalCode: '4390' },
  { suburb: 'Westville', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '3629' },
  { suburb: 'Pinetown', city: 'Pinetown', province: 'KwaZulu-Natal', postalCode: '3610' },
  { suburb: 'Hillcrest', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '3610' },
  { suburb: 'Queensburgh', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4093' },
  { suburb: 'Musgrave', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4001' },
  { suburb: 'Morningside', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4001' },
  { suburb: 'Glenwood', city: 'Durban', province: 'KwaZulu-Natal', postalCode: '4001' },
  { suburb: 'Margate', city: 'Margate', province: 'KwaZulu-Natal', postalCode: '4275' },
  { suburb: 'Port Shepstone', city: 'Port Shepstone', province: 'KwaZulu-Natal', postalCode: '4240' },
  { suburb: 'Southbroom', city: 'Southbroom', province: 'KwaZulu-Natal', postalCode: '4267' },
  { suburb: ' Ramsgate', city: 'Margate', province: 'KwaZulu-Natal', postalCode: '4275' },
  { suburb: 'Umtentweni', city: 'Port Shepstone', province: 'KwaZulu-Natal', postalCode: '4235' },
  { suburb: 'Richards Bay', city: 'Richards Bay', province: 'KwaZulu-Natal', postalCode: '3900' },
  { suburb: 'Empangeni', city: 'Empangeni', province: 'KwaZulu-Natal', postalCode: '3880' },
  { suburb: 'Mtubatuba', city: 'Mtubatuba', province: 'KwaZulu-Natal', postalCode: '3935' },
  { suburb: 'Stanger', city: 'Stanger', province: 'KwaZulu-Natal', postalCode: '4450' },
  { suburb: 'Pietermaritzburg', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', postalCode: '3201' },
  { suburb: 'Howick', city: 'Howick', province: 'KwaZulu-Natal', postalCode: '3290' },
  { suburb: 'Midlands', city: 'Pietermaritzburg', province: 'KwaZulu-Natal', postalCode: '3290' },
  { suburb: 'Newcastle', city: 'Newcastle', province: 'KwaZulu-Natal', postalCode: '2940' },
  { suburb: 'Ladysmith', city: 'Ladysmith', province: 'KwaZulu-Natal', postalCode: '3370' },
  { suburb: 'Dundee', city: 'Dundee', province: 'KwaZulu-Natal', postalCode: '3000' },
  { suburb: 'Vryheid', city: 'Vryheid', province: 'KwaZulu-Natal', postalCode: '3100' },
  { suburb: 'Ulundi', city: 'Ulundi', province: 'KwaZulu-Natal', postalCode: '3838' },
  { suburb: 'Melmoth', city: 'Melmoth', province: 'KwaZulu-Natal', postalCode: '3137' },

  // Eastern Cape
  { suburb: 'Port Elizabeth CBD', city: 'Port Elizabeth', province: 'Eastern Cape', postalCode: '6001' },
  { suburb: 'Summerstrand', city: 'Port Elizabeth', province: 'Eastern Cape', postalCode: '6019' },
  { suburb: 'Humewood', city: 'Port Elizabeth', province: 'Eastern Cape', postalCode: '6013' },
  { suburb: 'Walmer', city: 'Port Elizabeth', province: 'Eastern Cape', postalCode: '6070' },
  { suburb: 'Missionvale', city: 'Port Elizabeth', province: 'Eastern Cape', postalCode: '6059' },
  { suburb: 'East London CBD', city: 'East London', province: 'Eastern Cape', postalCode: '5201' },
  { suburb: 'Beachfront', city: 'East London', province: 'Eastern Cape', postalCode: '5241' },
  { suburb: 'Vincent', city: 'East London', province: 'Eastern Cape', postalCode: '5217' },
  { suburb: 'Gonubie', city: 'East London', province: 'Eastern Cape', postalCode: '5257' },
  { suburb: 'Mthatha', city: 'Mthatha', province: 'Eastern Cape', postalCode: '5099' },
  { suburb: 'Queenstown', city: 'Queenstown', province: 'Eastern Cape', postalCode: '5319' },
  { suburb: 'Cradock', city: 'Cradock', province: 'Eastern Cape', postalCode: '5880' },
  { suburb: 'Graaff-Reinet', city: 'Graaff-Reinet', province: 'Eastern Cape', postalCode: '6280' },
  { suburb: 'Grahamstown', city: 'Grahamstown', province: 'Eastern Cape', postalCode: '6139' },
  { suburb: 'King William\'s Town', city: 'King William\'s Town', province: 'Eastern Cape', postalCode: '5600' },
  { suburb: 'Bhisho', city: 'Bhisho', province: 'Eastern Cape', postalCode: '5605' },
  { suburb: 'Jeffreys Bay', city: 'Jeffreys Bay', province: 'Eastern Cape', postalCode: '6330' },
  { suburb: 'Storms River', city: 'Storms River', province: 'Eastern Cape', postalCode: '6308' },
  { suburb: 'Port Alfred', city: 'Port Alfred', province: 'Eastern Cape', postalCode: '6170' },
  { suburb: 'Fort Beaufort', city: 'Fort Beaufort', province: 'Eastern Cape', postalCode: '5720' },

  // Free State
  { suburb: 'Bloemfontein CBD', city: 'Bloemfontein', province: 'Free State', postalCode: '9301' },
  { suburb: 'Westdene', city: 'Bloemfontein', province: 'Free State', postalCode: '9301' },
  { suburb: 'Fichardtpark', city: 'Bloemfontein', province: 'Free State', postalCode: '9307' },
  { suburb: 'Langenhoven Park', city: 'Bloemfontein', province: 'Free State', postalCode: '9301' },
  { suburb: 'Welkom', city: 'Welkom', province: 'Free State', postalCode: '9459' },
  { suburb: 'Odendaalsrus', city: 'Welkom', province: 'Free State', postalCode: '9480' },
  { suburb: 'Sasolburg', city: 'Sasolburg', province: 'Free State', postalCode: '1947' },
  { suburb: 'Parys', city: 'Parys', province: 'Free State', postalCode: '2495' },
  { suburb: 'Kroonstad', city: 'Kroonstad', province: 'Free State', postalCode: '9499' },
  { suburb: 'Bethulie', city: 'Bethulie', province: 'Free State', postalCode: '9992' },
  { suburb: 'Bethlehem', city: 'Bethlehem', province: 'Free State', postalCode: '9700' },
  { suburb: 'Clarens', city: 'Clarens', province: 'Free State', postalCode: '9707' },
  { suburb: 'Winburg', city: 'Winburg', province: 'Free State', postalCode: '9420' },
  { suburb: 'Wesselsbron', city: 'Wesselsbron', province: 'Free State', postalCode: '9960' },
  { suburb: 'Boshof', city: 'Boshof', province: 'Free State', postalCode: '8340' },

  // Limpopo
  { suburb: 'Polokwane CBD', city: 'Polokwane', province: 'Limpopo', postalCode: '0699' },
  { suburb: 'Bendor', city: 'Polokwane', province: 'Limpopo', postalCode: '0700' },
  { suburb: 'Thabazimbi', city: 'Thabazimbi', province: 'Limpopo', postalCode: '0380' },
  { suburb: 'Mokopane', city: 'Mokopane', province: 'Limpopo', postalCode: '0601' },
  { suburb: 'Musina', city: 'Musina', province: 'Limpopo', postalCode: '0900' },
  { suburb: 'Louis Trichardt', city: 'Louis Trichardt', province: 'Limpopo', postalCode: '0920' },
  { suburb: 'Tzaneen', city: 'Tzaneen', province: 'Limpopo', postalCode: '0850' },
  { suburb: 'Letsitele', city: 'Letsitele', province: 'Limpopo', postalCode: '0885' },
  { suburb: 'Phalaborwa', city: 'Phalaborwa', province: 'Limpopo', postalCode: '1390' },
  { suburb: 'Hoedspruit', city: 'Hoedspruit', province: 'Limpopo', postalCode: '1380' },
  { suburb: 'Bela-Bela', city: 'Bela-Bela', province: 'Limpopo', postalCode: '0480' },
  { suburb: 'Modimolle', city: 'Modimolle', province: 'Limpopo', postalCode: '0510' },
  { suburb: 'Mookgopong', city: 'Mookgopong', province: 'Limpopo', postalCode: '0560' },
  { suburb: 'Lephalale', city: 'Lephalale', province: 'Limpopo', postalCode: '0555' },
  { suburb: 'Ga-Rankuwa', city: 'Pretoria', province: 'Limpopo', postalCode: '0208' },
  { suburb: 'Mankweng', city: 'Polokwane', province: 'Limpopo', postalCode: '0727' },
  { suburb: 'Bolkedraai', city: 'Musina', province: 'Limpopo', postalCode: '0904' },

  // Mpumalanga
  { suburb: 'Nelspruit CBD', city: 'Nelspruit', province: 'Mpumalanga', postalCode: '1200' },
  { suburb: 'Riverside', city: 'Nelspruit', province: 'Mpumalanga', postalCode: '1200' },
  { suburb: 'West Acres', city: 'Nelspruit', province: 'Mpumalanga', postalCode: '1211' },
  { suburb: 'Mbombela', city: 'Nelspruit', province: 'Mpumalanga', postalCode: '1200' },
  { suburb: 'Witrivier', city: 'White River', province: 'Mpumalanga', postalCode: '1240' },
  { suburb: 'Hazyview', city: 'Hazyview', province: 'Mpumalanga', postalCode: '1242' },
  { suburb: 'Sabie', city: 'Sabie', province: 'Mpumalanga', postalCode: '1260' },
  { suburb: 'Graskop', city: 'Graskop', province: 'Mpumalanga', postalCode: '1270' },
  { suburb: 'Blyderivierspoort', city: 'Blyderivierspoort', province: 'Mpumalanga', postalCode: '1280' },
  { suburb: 'Middelburg', city: 'Middelburg', province: 'Mpumalanga', postalCode: '1050' },
  { suburb: 'Mhlume', city: 'Mhlume', province: 'Mpumalanga', postalCode: '1340' },
  { suburb: 'Barberton', city: 'Barberton', province: 'Mpumalanga', postalCode: '1300' },
  { suburb: 'Bethal', city: 'Bethal', province: 'Mpumalanga', postalCode: '2310' },
  { suburb: 'Emalahleni', city: 'Emalahleni', province: 'Mpumalanga', postalCode: '2285' },
  { suburb: 'Witbank', city: 'Emalahleni', province: 'Mpumalanga', postalCode: '2285' },
  { suburb: 'eMakhazeni', city: 'eMakhazeni', province: 'Mpumalanga', postalCode: '1100' },
  { suburb: 'Waterval-Boven', city: 'Waterval-Boven', province: 'Mpumalanga', postalCode: '1195' },
  { suburb: 'Lydenburg', city: 'Lydenburg', province: 'Mpumalanga', postalCode: '1120' },
  { suburb: 'Dullstroom', city: 'Dullstroom', province: 'Mpumalanga', postalCode: '1110' },
  { suburb: 'Komatipoort', city: 'Komatipoort', province: 'Mpumalanga', postalCode: '1340' },

  // Northern Cape
  { suburb: 'Kimberley CBD', city: 'Kimberley', province: 'Northern Cape', postalCode: '8301' },
  { suburb: 'Beaumont', city: 'Kimberley', province: 'Northern Cape', postalCode: '8301' },
  { suburb: 'Upington', city: 'Upington', province: 'Northern Cape', postalCode: '8801' },
  { suburb: 'Keimoes', city: 'Keimoes', province: 'Northern Cape', postalCode: '8860' },
  { suburb: 'Kuruman', city: 'Kuruman', province: 'Northern Cape', postalCode: '8500' },
  { suburb: 'Springbok', city: 'Springbok', province: 'Northern Cape', postalCode: '8240' },
  { suburb: 'Calvinia', city: 'Calvinia', province: 'Northern Cape', postalCode: '8190' },
  { suburb: 'Sutherland', city: 'Sutherland', province: 'Northern Cape', postalCode: '6920' },
  { suburb: 'Postmasburg', city: 'Postmasburg', province: 'Northern Cape', postalCode: '8420' },
  { suburb: 'Colesberg', city: 'Colesberg', province: 'Northern Cape', postalCode: '9795' },
  { suburb: 'Prieska', city: 'Prieska', province: 'Northern Cape', postalCode: '8900' },
  { suburb: 'Douglas', city: 'Douglas', province: 'Northern Cape', postalCode: '8730' },
  { suburb: 'Carnarvon', city: 'Carnarvon', province: 'Northern Cape', postalCode: '8925' },
  { suburb: 'Williston', city: 'Williston', province: 'Northern Cape', postalCode: '8920' },
  { suburb: ' Fraserburg', city: 'Fraserburg', province: 'Northern Cape', postalCode: '8290' },

  // North West
  { suburb: 'Rustenburg CBD', city: 'Rustenburg', province: 'North West', postalCode: '0299' },
  { suburb: 'Protea Park', city: 'Rustenburg', province: 'North West', postalCode: '0299' },
  { suburb: 'Klerksdorp CBD', city: 'Klerksdorp', province: 'North West', postalCode: '2570' },
  { suburb: 'Potchefstroom', city: 'Potchefstroom', province: 'North West', postalCode: '2520' },
  { suburb: 'Mahikeng', city: 'Mahikeng', province: 'North West', postalCode: '2745' },
  { suburb: 'Mafikeng', city: 'Mahikeng', province: 'North West', postalCode: '2745' },
  { suburb: 'Zeerust', city: 'Zeerust', province: 'North West', postalCode: '2865' },
  { suburb: 'Bloemhof', city: 'Bloemhof', province: 'North West', postalCode: '2660' },
  { suburb: 'Christiana', city: 'Christiana', province: 'North West', postalCode: '2680' },
  { suburb: 'Lichtenburg', city: 'Lichtenburg', province: 'North West', postalCode: '2740' },
  { suburb: 'Ventersdorp', city: 'Ventersdorp', province: 'North West', postalCode: '2710' },
  { suburb: 'Koster', city: 'Koster', province: 'North West', postalCode: '0342' },
  { suburb: 'Swartruggens', city: 'Swartruggens', province: 'North West', postalCode: '2835' },
  { suburb: ' Brits', city: 'Brits', province: 'North West', postalCode: '0250' },
  { suburb: 'Hartbeespoort', city: 'Hartbeespoort', province: 'North West', postalCode: '0216' },
  { suburb: 'Mooinooi', city: 'Mooinooi', province: 'North West', postalCode: '0325' },
];

interface AddressSuggestion {
  suburb: string;
  city: string;
  province: string;
  postalCode: string;
  displayText: string;
}

/**
 * Address Suggestions API
 * 
 * Returns address suggestions for South African locations.
 * Used for address autocomplete in checkout forms.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() ?? '';

    if (query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Filter matching addresses
    const matches = SA_ADDRESSES.filter((addr) => {
      const searchable = `${addr.suburb} ${addr.city} ${addr.province} ${addr.postalCode}`.toLowerCase();
      return searchable.includes(query);
    })
      .slice(0, 8)
      .map((addr): AddressSuggestion => ({
        suburb: addr.suburb,
        city: addr.city,
        province: addr.province,
        postalCode: addr.postalCode,
        displayText: `${addr.suburb}, ${addr.city}, ${addr.province}, ${addr.postalCode}`,
      }));

    return NextResponse.json({ suggestions: matches });
  } catch (error) {
    console.error('[Address Suggestions] Error:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
