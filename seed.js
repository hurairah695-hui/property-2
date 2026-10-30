// Adds 3 demo users (one per role). Run once: npm run seed
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const users = [
    ['Demo Admin',  'admin@example.com',  'Admin@1234',  'admin'],
    ['Demo Buyer',  'buyer@example.com',  'Buyer@1234',  'buyer'],
    ['Demo Seller', 'seller@example.com', 'Seller@1234', 'seller'],
  ];

  for (const [name, email, pw, role] of users) {
    const hash = await bcrypt.hash(pw, 10);
    await db.execute(
      'INSERT IGNORE INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, role]
    );
  }

  // Sample listings for the demo seller (only if they have none yet)
  const [[seller]] = await db.execute("SELECT id FROM users WHERE email = 'seller@example.com'");
  const [[{ n }]] = await db.execute('SELECT COUNT(*) AS n FROM properties WHERE seller_id = ?', [seller.id]);
  if (n === 0) {
    const samples = [
      ['Modern 10 Marla House, Bahria Town', 'house', 38500000, 'Rawalpindi', '10 Marla', 5, 4, 'Double-storey home with a lawn, modular kitchen and covered parking.'],
      ['Corner Shop on Main Boulevard', 'shop', 12500000, 'Lahore', '450 sq ft', null, null, 'Ground-floor corner shop with high footfall and a wide frontage.'],
      ['Residential Plot, DHA Phase 2', 'plot', 9500000, 'Islamabad', '1 Kanal', null, null, 'Ready-to-build plot on a 60 ft road. All utilities nearby.'],
      ['2-Bed Apartment, F-11 Markaz', 'apartment', 21000000, 'Islamabad', '1,150 sq ft', 2, 2, 'Bright apartment with a balcony, lift and 24/7 security.'],
      ['5 Marla Family Home', 'house', 17500000, 'Lahore', '5 Marla', 3, 3, 'Neat family home in a quiet, gated society close to schools.'],
      ['Commercial Plot near Motorway', 'plot', 28000000, 'Rawalpindi', '8 Marla', null, null, 'Corner commercial plot with easy motorway access.'],
    ];
    for (const s of samples) {
      await db.execute(
        'INSERT INTO properties (seller_id, title, type, price, city, area_size, beds, baths, description) VALUES (?,?,?,?,?,?,?,?,?)',
        [seller.id, ...s]
      );
    }
  }
  console.log('Demo users and sample properties added.');
  await db.end();
})();
