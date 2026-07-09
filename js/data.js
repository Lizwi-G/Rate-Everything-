/* ============================================================
   KhethaBiz — Seed Data
   Sample South African businesses used to populate the
   directory for the prototype. In production this comes from
   the API / registered businesses database.
   ============================================================ */

const KB_CATEGORIES = [
  { key: "restaurants", label: "Restaurants & Food", icon: "🍽️", gradient: "linear-gradient(135deg,#e96443,#904e95)" },
  { key: "beauty",      label: "Beauty & Salons",    icon: "💇🏾‍♀️", gradient: "linear-gradient(135deg,#f857a6,#ff5858)" },
  { key: "automotive",  label: "Automotive",         icon: "🚗", gradient: "linear-gradient(135deg,#36d1dc,#5b86e5)" },
  { key: "health",      label: "Health & Wellness",  icon: "🩺", gradient: "linear-gradient(135deg,#11998e,#38ef7d)" },
  { key: "tech",        label: "Tech & Repairs",     icon: "💻", gradient: "linear-gradient(135deg,#8e2de2,#4a00e0)" },
  { key: "retail",      label: "Retail & Shopping",  icon: "🛍️", gradient: "linear-gradient(135deg,#f7971e,#ffd200)" },
  { key: "home",        label: "Home Services",      icon: "🛠️", gradient: "linear-gradient(135deg,#396afc,#2948ff)" },
  { key: "travel",      label: "Travel & Stays",     icon: "🧳", gradient: "linear-gradient(135deg,#0f9b8e,#38b2ac)" }
];

const KB_PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Free State", "Limpopo", "Mpumalanga", "North West", "Northern Cape"
];

const KB_SEED_BUSINESSES = [
  {
    id: "kb-001",
    name: "Kota Kasi Flavours",
    category: "restaurants",
    icon: "🥪",
    city: "Soweto",
    province: "Gauteng",
    description: "Legendary township kotas and bunny chows stacked with love. A true kasi experience with generous portions.",
    services: ["Kotas", "Bunny Chow", "Chips & Russians", "Catering"],
    verified: true,
    ratings: [5, 5, 4, 5, 4, 5, 5]
  },
  {
    id: "kb-002",
    name: "Braai Republic Grill House",
    category: "restaurants",
    icon: "🍖",
    city: "Pretoria",
    province: "Gauteng",
    description: "Flame-grilled shisanyama with live weekend jazz. Famous for boerewors rolls and chesa nyama platters.",
    services: ["Shisanyama", "Platters", "Events", "Takeaways"],
    verified: true,
    ratings: [4, 5, 4, 4, 5, 3, 4, 5]
  },
  {
    id: "kb-003",
    name: "Mama Thandi's Kitchen",
    category: "restaurants",
    icon: "🍲",
    city: "Durban",
    province: "KwaZulu-Natal",
    description: "Home-style African cuisine — umngqusho, tripe, and the best curry in KZN, served with warmth.",
    services: ["Traditional Meals", "Curries", "Catering", "Delivery"],
    verified: false,
    ratings: [5, 4, 5, 5, 5]
  },
  {
    id: "kb-004",
    name: "Glow Up Hair Studio",
    category: "beauty",
    icon: "💅🏾",
    city: "Johannesburg",
    province: "Gauteng",
    description: "Braids, wigs, natural hair care and nail artistry. Walk in tired, walk out glowing.",
    services: ["Braiding", "Wig Installs", "Nails", "Natural Hair Care"],
    verified: true,
    ratings: [5, 5, 5, 4, 5, 4]
  },
  {
    id: "kb-005",
    name: "Kasi Kuts Barbershop",
    category: "beauty",
    icon: "💈",
    city: "Khayelitsha",
    province: "Western Cape",
    description: "Sharp fades, clean line-ups and good vibes. The neighbourhood's favourite chair for over a decade.",
    services: ["Fades", "Beard Trims", "Kids Cuts", "Dye & Design"],
    verified: false,
    ratings: [4, 5, 4, 4, 4, 5, 3]
  },
  {
    id: "kb-006",
    name: "Ubuntu Auto Works",
    category: "automotive",
    icon: "🔧",
    city: "Port Elizabeth (Gqeberha)",
    province: "Eastern Cape",
    description: "Honest mechanics, fair quotes. Full vehicle servicing, diagnostics and roadworthy checks.",
    services: ["Servicing", "Diagnostics", "Brakes & Clutch", "Roadworthy"],
    verified: true,
    ratings: [4, 4, 5, 4, 3, 4]
  },
  {
    id: "kb-007",
    name: "Mzansi Motors Pre-Owned",
    category: "automotive",
    icon: "🚙",
    city: "Bloemfontein",
    province: "Free State",
    description: "Quality pre-owned vehicles with full service history. Finance assistance and trade-ins welcome.",
    services: ["Car Sales", "Trade-Ins", "Finance Assistance", "Warranties"],
    verified: true,
    ratings: [4, 3, 4, 5, 4]
  },
  {
    id: "kb-008",
    name: "Sunrise Family Clinic",
    category: "health",
    icon: "🏥",
    city: "Polokwane",
    province: "Limpopo",
    description: "Affordable family healthcare — GP consultations, chronic care, wellness screenings and vaccinations.",
    services: ["GP Consults", "Chronic Care", "Vaccinations", "Screenings"],
    verified: true,
    ratings: [5, 4, 5, 4, 4, 5]
  },
  {
    id: "kb-009",
    name: "Zen Den Wellness Spa",
    category: "health",
    icon: "🧖🏾‍♀️",
    city: "Stellenbosch",
    province: "Western Cape",
    description: "Massages, facials and full-day pamper packages in the heart of the winelands.",
    services: ["Massages", "Facials", "Couples Packages", "Vouchers"],
    verified: false,
    ratings: [5, 5, 4, 5]
  },
  {
    id: "kb-010",
    name: "Jozi Tech Repairs",
    category: "tech",
    icon: "📱",
    city: "Johannesburg",
    province: "Gauteng",
    description: "Same-day phone and laptop repairs. Screen replacements, battery swaps and data recovery you can trust.",
    services: ["Screen Repairs", "Battery Swaps", "Data Recovery", "Laptop Repairs"],
    verified: true,
    ratings: [4, 5, 5, 4, 4, 5, 5, 4]
  },
  {
    id: "kb-011",
    name: "CodeCraft Web Studio",
    category: "tech",
    icon: "🖥️",
    city: "Cape Town",
    province: "Western Cape",
    description: "Websites, e-commerce stores and branding for small businesses. Get your hustle online.",
    services: ["Websites", "E-Commerce", "Logo Design", "SEO"],
    verified: false,
    ratings: [5, 4, 4, 5]
  },
  {
    id: "kb-012",
    name: "Thabo's Fresh Produce",
    category: "retail",
    icon: "🥬",
    city: "Mbombela",
    province: "Mpumalanga",
    description: "Farm-fresh vegetables and fruit at street-friendly prices. Supporting local farmers since 2015.",
    services: ["Fresh Produce", "Bulk Orders", "Stokvel Deals", "Delivery"],
    verified: false,
    ratings: [4, 4, 5, 4, 4]
  },
  {
    id: "kb-013",
    name: "Proudly SA Crafts Market",
    category: "retail",
    icon: "🧺",
    city: "Durban",
    province: "KwaZulu-Natal",
    description: "Handmade beadwork, shweshwe fabric goods and local art. Every purchase supports a local artisan.",
    services: ["Beadwork", "Fabric Goods", "Local Art", "Gift Boxes"],
    verified: true,
    ratings: [5, 5, 4, 5, 5]
  },
  {
    id: "kb-014",
    name: "FixIt Right Plumbing",
    category: "home",
    icon: "🚿",
    city: "Rustenburg",
    province: "North West",
    description: "24/7 emergency plumbing, geyser installations and leak detection. No call-out fee for quotes.",
    services: ["Emergency Plumbing", "Geysers", "Leak Detection", "Drains"],
    verified: true,
    ratings: [4, 3, 4, 4, 5, 4]
  },
  {
    id: "kb-015",
    name: "Sparkle Domestic Services",
    category: "home",
    icon: "🧹",
    city: "Centurion",
    province: "Gauteng",
    description: "Reliable home and office cleaning teams. Once-off deep cleans or weekly schedules — vetted staff.",
    services: ["Home Cleaning", "Office Cleaning", "Deep Cleans", "Windows"],
    verified: false,
    ratings: [4, 5, 4, 4]
  },
  {
    id: "kb-016",
    name: "Karoo Star Guest Lodge",
    category: "travel",
    icon: "🏜️",
    city: "Upington",
    province: "Northern Cape",
    description: "Stargazing, quiet luxury and famous Karoo lamb dinners. The perfect stopover on your N10 road trip.",
    services: ["Accommodation", "Dinners", "Stargazing Tours", "Conferences"],
    verified: true,
    ratings: [5, 5, 5, 4, 5]
  },
  {
    id: "kb-017",
    name: "Wild Coast Adventures",
    category: "travel",
    icon: "🏄🏾",
    city: "Port St Johns",
    province: "Eastern Cape",
    description: "Guided hikes, surf lessons and cultural village tours along the breathtaking Wild Coast.",
    services: ["Hiking Tours", "Surf Lessons", "Village Tours", "Camping"],
    verified: false,
    ratings: [5, 4, 5, 5, 4, 5]
  },
  {
    id: "kb-018",
    name: "Ekasi Fibre Solutions",
    category: "tech",
    icon: "📡",
    city: "Tembisa",
    province: "Gauteng",
    description: "Affordable uncapped fibre and Wi-Fi installations for townships. Fast setup, real support.",
    services: ["Fibre Installs", "Wi-Fi Setup", "Uncapped Packages", "Support"],
    verified: true,
    ratings: [4, 4, 3, 4, 5, 4]
  }
];
