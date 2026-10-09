// Seeds the Shawon Food Gate menu (categories, products, images) and the
// restaurant settings into the database in MONGODB_URI.
//
//   node --env-file=.env.local scripts/seed-sfg-menu.mjs
//
// Idempotent: categories/products are upserted by slug and media by
// public_id, so re-running updates prices/descriptions instead of
// duplicating. Nothing else in the database is touched or deleted.
// Images are served locally from public/assets/food/*.jpg; replace them
// later from Admin > Media (Cloudinary) with the restaurant's own photos.

import mongoose from "mongoose";

const DB_NAME = process.env.MONGODB_DB || "Ecommarce"; // must match lib/databaseconnection.js

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// [name, price, description?, imageKey?, flags?]
// flags: { loved: true, badge: "..." }
const MENU = [
  {
    name: "All Day Breakfast",
    image: "full-english",
    description: "Proper English breakfasts and bagels, served all day from 8AM.",
    items: [
      ["Full English Breakfast", 8.99, "Egg x2, sausage x2, turkey rashers x2, mushroom, tomato, beans, avocado and toasted bagel.", "full-english"],
      ["Big English Breakfast", 11.99, "Egg x2, sausage x2, turkey rashers x2, hash browns x2, chips, mushroom, tomato, beans, avocado and toasted bagel.", "english-plate", { loved: true, badge: "Popular" }],
      ["Vegetarian Breakfast", 8.99, "Egg x2, hash brown x2, veggie pattie, mushroom, beans and toasted bagel.", "brunch"],
      ["Vegetarian Wrap", 5.99, "Hash brown x2, veggie pattie, salad, cheese and sauce.", "doner"],
      ["Breakfast Wrap", 6.99, "Egg x2, sausage x2, turkey rashers x2, sauce and grated cheese.", "doner"],
      ["Healthy Breakfast Bagel", 6.49, "Egg x2, sausage x2, turkey rashers x2, sauce and cheese.", "bagel"],
      ["Light Breakfast Bagel", 5.49, "Egg, sausage, turkey rashers, hash brown, sauce and cheese.", "bagel"],
      ["Salmon Avocado Classic Bagel", 4.99, "Smoked salmon and fresh avocado on a toasted bagel.", "bagel"],
    ],
  },
  {
    name: "Desi Breakfast",
    image: "curries",
    special: true,
    description: "Bangladeshi-style breakfast platters with paratha and deshi chai.",
    items: [
      ["Dhaka Breakfast Platter", 7.99, "2 paratha, beef bhuna, chana dal, egg omelette and deshi chai.", "curries", { badge: "Must Try" }],
      ["Sylheti Breakfast Thali", 7.99, "2 paratha, chicken bhuna, mix vegetables, egg omelette and deshi chai.", "chicken-curry"],
    ],
  },
  {
    name: "Flame Grill & Peri Peri",
    image: "peri-chicken",
    description: "Served with house special salted fries, salad and signature sauces.",
    items: [
      ["Quarter Peri Peri Chicken", 5.99],
      ["Half Peri Peri Chicken", 8.99],
      ["Whole Peri Peri Chicken", 13.99, null, null, { loved: true, badge: "Best Seller" }],
      ["Peri Chicken Wings", 5.99, null, "wings"],
      ["Half Grilled Chicken", 8.99],
      ["Whole Grilled Chicken", 13.99],
    ],
  },
  {
    name: "Signature Grill",
    image: "shish",
    description: "Char-grilled favourites served with classic fries, salad and sauces.",
    items: [
      ["Chicken Tikka (6 pcs)", 7.99, null, "shish"],
      ["Tandoori Chicken", 7.99, null, "tandoori"],
      ["Lamb Chops (4 pcs)", 9.99, null, "lamb-grill", { loved: true }],
    ],
  },
  {
    name: "Flame Grilled Fish",
    image: "fish",
    description: "Whole fish grilled over flame, served with classic fries, salad and signature sauces.",
    items: [
      ["Whole Sea Bass Grill", 12.99],
      ["Whole Rupchada Grill", 12.99],
    ],
  },
  {
    name: "Signature Bowls",
    image: "salad-bowl",
    description: "Hearty rice bowls topped with flame-grilled peri chicken.",
    items: [
      ["Peri Rice Chicken Bowl", 8.99, "Spicy rice, peri chicken, salad and sauces."],
      ["Avocado Peri Rice Bowl", 9.99, "Spicy rice, peri chicken, avocado, grilled tomato and onion."],
    ],
  },
  {
    name: "Grill Platters",
    image: "grill-platter",
    description: "Mixed grill platters made for sharing.",
    items: [
      ["Platter for 2 People", 19.99, "3 pcs lamb chops, 4 pcs chicken tikka, 2 lamb seekh kebab, 2 pcs chicken seekh kebab, salad, fries and signature sauce.", "grill-platter", { loved: true, badge: "Sharing" }],
      ["Platter for 4 People", 35.99, "4 lamb chops, 4 pcs spicy wings, 4 pcs chicken tikka, 4 pcs lamb sikh kebab, 4 pcs chicken sikh kebab, fries, salad and signature sauces.", "tikka-platter"],
    ],
  },
  {
    name: "Kebab & Döner House",
    image: "doner",
    description: "Served with fries, naan or rice.",
    items: [
      ["Chicken Döner", 6.99],
      ["Lamb Döner", 6.99],
      ["Mixed Döner", 7.99],
      ["Chicken Kebab", 5.99, null, "shish"],
      ["Lamb Kebab", 5.99, null, "lamb-grill"],
      ["Chicken Shish Wrap", 6.99],
      ["Lamb Shish Wrap", 6.99],
      ["Döner Rice Box", 8.99],
      ["Mega Kebab Box", 9.99, "A loaded box of döner served with fries, naan or rice and our signature sauces.", null, { loved: true, badge: "Loaded" }],
    ],
  },
  {
    name: "Flavours of Lahore · Signature Curries",
    image: "karahi",
    description: "Served with rice or naan and fresh salad.",
    items: [
      ["Chicken Curry", 7.99, null, "chicken-curry"],
      ["Lamb Curry", 7.99],
      ["Bhindi Curry", 4.5, null, "curries"],
      ["Chicken Karahi", 7.99, null, "karahi", { loved: true }],
      ["Lamb Karahi", 7.99],
      ["Keema Curry", 7.99],
      ["Nihari", 7.99],
      ["Mix Vegetable", 4.99, null, "curries"],
      ["Daal Chana", 4.99, null, "curries"],
    ],
  },
  {
    name: "Taste of Bangladesh",
    image: "polao",
    special: true,
    description: "Home-style Bangladeshi classics.",
    items: [
      ["Nawabi Morog Polao", 8.99, null, "polao"],
      ["Beef Tehari", 6.99, null, "chicken-biryani"],
      ["Beef Bhuna Khichuri", 6.49, null, "curries"],
      ["Sindhi Chicken Biryani", 4.99, null, "biryani"],
      ["Chicken Bhuna", 5.99, null, "chicken-curry"],
      ["Chicken Roast", 5.99, null, "chicken-curry"],
      ["Beef Bhuna", 6.99, null, "karahi"],
      ["Shorshe Ilish", 7.99, null, "fish"],
      ["Tarka Dal", 2.49, null, "curries"],
      ["Sultan's Kacchi Biryani", 8.99, "Slow-cooked kacchi biryani. Available Fridays and Saturdays only.", "kacchi", { loved: true, badge: "Fri & Sat" }],
    ],
  },
  {
    name: "Rice Selection",
    image: "biryani",
    description: "Biryanis and rice sides.",
    items: [
      ["Chicken Biryani", 6.99, null, "biryani", { loved: true }],
      ["Lamb Biryani", 7.99, null, "chicken-biryani"],
      ["Plain Rice", 1.99, null, "polao"],
      ["Polau Rice", 2.99, null, "polao"],
      ["Spicy Rice", 2.99, null, "polao"],
      ["Turkish Rice", 2.99, null, "polao"],
    ],
  },
  {
    name: "Fresh Bread",
    image: "naan",
    description: "Baked fresh in our kitchen every day.",
    items: [
      ["Plain Naan", 1.25],
      ["Butter Naan", 1.49],
      ["Garlic Naan", 1.49],
      ["Plain Paratha", 1.25],
      ["Plain Roti", 1.25],
    ],
  },
  {
    name: "Light Eats & Healthy Bites",
    image: "noodles",
    description: "Lighter noodles and salads.",
    items: [
      ["House Special Chicken Chow Mein", 5.99, null, "noodles"],
      ["Korean Spicy Beef Noodles", 7.99, null, "noodles"],
      ["Chicken Cashew Nut Salad", 6.99, null, "salad-bowl"],
      ["Tandoori Chicken Salad", 5.99, null, "salad-bowl"],
    ],
  },
  {
    name: "Smash Burgers",
    image: "burger",
    description: "Make it a meal with fries and a soft drink for +£1.99.",
    items: [
      ["Classic Smash", 5.99, null, "burger", { loved: true }],
      ["Double Smash", 6.99, null, "double-burger"],
      ["Peri Peri Chicken Burger", 6.99, null, "chicken-burger"],
      ["Saalif's Combo Burger", 8.99, null, "burger-fries"],
      ["Meal Upgrade (Fries + Soft Drink)", 1.99, null, "burger-fries"],
    ],
  },
  {
    name: "Bagel · Panini · Wraps",
    image: "bagel",
    description:
      "Choose your filling: Creamy Chicken, Creamy Tuna, Royal Cajun, Smoky BBQ Chicken, Cajun Delight, Caribbean Jerk Chicken, Hot & Spicy Chicken or Tandoori Chicken Tikka.",
    items: [
      ["Bagel", 3.99],
      ["Panini", 4.99],
      ["Seeded Panini", 5.49],
      ["Wrap", 5.99, null, "doner"],
      ["Loaded Fries", 7.99, null, "fries"],
      ["Loaded Chicken Rice", 7.99, null, "salad-bowl"],
    ],
  },
  {
    name: "Extras",
    image: "salad-bowl",
    description: "Add extras to any bagel, panini or wrap.",
    items: [
      ["Avocado", 0.99],
      ["Turkey Rashers", 1.49, null, "english-plate"],
      ["Egg", 0.99, null, "english-plate"],
      ["Cheese", 0.49],
      ["Jalapeño", 0.49],
      ["Salad", 0.49],
    ],
  },
  {
    name: "Sides & Starters",
    image: "samosa",
    description: "Fries, samosas, rolls and more.",
    items: [
      ["Classic Fries", 1.99, null, "fries"],
      ["Peri Salted Fries", 2.49, null, "fries"],
      ["Cajun Chips", 2.49, null, "fries"],
      ["Cheese Chips", 3.49, null, "fries"],
      ["Mozzarella Sticks", 3.99, null, "fries"],
      ["Onion Rings", 3.49, null, "fries"],
      ["Hash Brown", 2.49, null, "english-plate"],
      ["Chicken Kebab Roll", 3.99, null, "doner"],
      ["Lamb Kebab Roll", 4.49, null, "doner"],
      ["Chicken Samosa (2 pcs)", 2.49],
      ["Lamb Samosa (2 pcs)", 2.99],
      ["Vegetable Samosa", 1.0],
      ["Onion Bhaji", 3.0],
      ["Chicken Dumplings (Steamed or Fried)", 6.95, null, "paneer-tikka"],
    ],
  },
  {
    name: "Coffee House",
    image: "coffee",
    description: "Freshly brewed coffee. Add syrup or oat milk for +50p.",
    items: [
      ["Espresso", 1.49],
      ["Americano", 2.49],
      ["Flat White", 2.99],
      ["Latte", 2.99, null, "latte"],
      ["Cappuccino", 2.99],
      ["Mocha", 2.99],
      ["Spanish Latte", 3.99, null, "latte"],
      ["Iced Latte", 3.49, null, "iced-latte"],
      ["Add Syrup", 0.5],
      ["Oat Milk", 0.5],
    ],
  },
  {
    name: "Chai & Co.",
    image: "chai",
    description: "Karak, masala and classic teas.",
    items: [
      ["English Tea", 1.8],
      ["Karak Chai", 2.0, "Strong, creamy, slow-brewed karak.", null, { loved: true }],
      ["Masala Chai", 2.0],
      ["Green Tea", 2.0],
      ["Mint Tea", 2.0],
    ],
  },
  {
    name: "Fresh & Sparkling",
    image: "mojito",
    description: "Mojitos, coolers and freshly pressed juices.",
    items: [
      ["Forest Gate Cooler", 4.49, null, "mojito", { badge: "House Special" }],
      ["Passion Fruit Mojito", 3.99, null, "mojito"],
      ["Mint Lemon Mojito", 3.99, null, "mojito-clear"],
      ["Strawberry Mojito", 3.99, null, "berry-shake"],
      ["Blue Lagoon", 3.99, null, "mojito-clear"],
      ["Mango Passion", 3.99, null, "orange-juice"],
      ["Fresh Watermelon Juice", 3.99, null, "berry-shake"],
      ["Fresh Orange Juice", 3.99, null, "orange-juice"],
      ["Fresh Apple Juice", 3.99, null, "orange-juice"],
    ],
  },
  {
    name: "Premium Shakes & Lassi",
    image: "milkshake",
    description: "Thick premium milkshakes and traditional lassi.",
    items: [
      ["Lotus Biscoff Milkshake", 3.99],
      ["Ferrero Rocher Milkshake", 3.99],
      ["Kinder Bueno Milkshake", 3.99],
      ["Oreo Milkshake", 3.99],
      ["Mango Milkshake", 3.99, null, "orange-juice"],
      ["Food Gate Signature Lassi", 3.99, null, "latte", { badge: "Signature" }],
      ["Mango Lassi", 3.49, null, "orange-juice"],
      ["Sweet Lassi", 3.49, null, "latte"],
      ["Salted Lassi", 3.49, null, "latte"],
    ],
  },
  {
    name: "Sweet Treats",
    image: "cake",
    description: "Cakes and desserts.",
    items: [
      ["Milk Cake", 4.99],
      ["Chocolate Cake", 4.49],
      ["Red Velvet Cake", 4.49],
      ["Pistachio Cake", 4.99],
      ["Ice Cream", 4.99, null, "milkshake"],
      ["Firni", 2.99, null, "latte"],
    ],
  },
];

const OPENING_HOURS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => ({
  day,
  open: "08:00",
  close: "00:00",
  closed: false,
}));

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed-sfg-menu.mjs");
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const medias = db.collection("medias");
  const categories = db.collection("categories");
  const products = db.collection("products");
  const settings = db.collection("restaurantsettings");

  const mediaIds = new Map();
  async function mediaFor(key, title) {
    if (mediaIds.has(key)) return mediaIds.get(key);
    const url = `/assets/food/${key}.jpg`;
    const publicId = `sfg-seed/${key}`;
    const now = new Date();
    const res = await medias.findOneAndUpdate(
      { public_id: publicId },
      {
        $set: { secure_url: url, path: url, thumbnail_url: url, title, alt: title, deletedAt: null, updatedAt: now },
        $setOnInsert: { asset_id: publicId, public_id: publicId, createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    const id = (res?.value ?? res)._id;
    mediaIds.set(key, id);
    return id;
  }

  // The storefront lists categories/products newest-first, so stamp
  // createdAt in reverse menu order to keep the printed menu's order.
  const base = Date.now();
  let catCount = 0;
  let prodCount = 0;

  for (let ci = 0; ci < MENU.length; ci++) {
    const cat = MENU[ci];
    const catSlug = slugify(cat.name);
    const catMedia = await mediaFor(cat.image, cat.name);
    const catTime = new Date(base - ci * 60_000);

    const catRes = await categories.findOneAndUpdate(
      { slug: catSlug },
      {
        $set: {
          name: cat.name,
          description: cat.description || "",
          media: [catMedia],
          active: true,
          sortOrder: ci,
          isBangladeshiSpecial: !!cat.special,
          deletedAt: null,
          createdAt: catTime,
          updatedAt: new Date(),
        },
        $setOnInsert: { slug: catSlug },
      },
      { upsert: true, returnDocument: "after" },
    );
    const catId = (catRes?.value ?? catRes)._id;
    catCount++;

    for (let pi = 0; pi < cat.items.length; pi++) {
      const [name, price, desc, imageKey, flags = {}] = cat.items[pi];
      const slug = slugify(name);
      const media = await mediaFor(imageKey || cat.image, name);

      await products.updateOne(
        { slug },
        {
          $set: {
            name,
            category: catId,
            mrp: price,
            sellingPrice: price,
            discountPercentage: 0,
            isMostLoved: !!flags.loved,
            badge: flags.badge || "",
            offers: [],
            mealBuilderType: "",
            freeDelivery: false,
            active: true,
            available: true,
            posVisible: true,
            onlineVisible: true,
            sortOrder: pi,
            inventoryTracked: false,
            media: [media],
            description: desc || cat.description || `${name}, freshly prepared to order.`,
            deletedAt: null,
            createdAt: new Date(catTime.getTime() - pi * 1000),
            updatedAt: new Date(),
          },
          $setOnInsert: { slug, sku: "", costPrice: 0, taxRate: 0, taxCode: "", calories: null },
        },
        { upsert: true },
      );
      prodCount++;
    }
  }

  await settings.updateOne(
    {},
    {
      $set: {
        "general.name": "Shawon Food Gate",
        "general.address": "179 Forest Ln, London E7 9BB",
        "general.phone": "020 3995 6692",
        "business.currencyCode": "GBP",
        "business.currencySymbol": "£",
        "business.openingHours": OPENING_HOURS,
        "orders.posOrderPrefix": "SFG-",
        "orders.receiptFooterText": "Thank you for choosing Shawon Food Gate! 100% Halal.",
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  console.log(`Seeded ${catCount} categories, ${prodCount} products, ${mediaIds.size} images, and restaurant settings.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
