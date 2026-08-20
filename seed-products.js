// Seeds the full 40-product demo catalog (20 coffee + 20 bakery) into an
// EXISTING database WITHOUT touching orders, customers or admin changes.
// Safe to run any number of times:
//   · new products are inserted once (matched by name)
//   · existing products that still point at old Unsplash demo photos get a
//     free image refresh (prices/descriptions set by the admin are kept)
// Run: node seed-products.js   (start MySQL/XAMPP first)
const mysql = require('mysql2/promise');
const cfg = require('./config.js');

const U = id => 'https://images.unsplash.com/' + id + '?w=600&q=80&auto=format&fit=crop';

const ITEMS = [
  // ── COFFEE (20) ──
  { cat: 1, name: 'Doppio Classico', desc: 'Double shot house blend — dark chocolate, toasted walnut, orange zest.', price: 4.50, emoji: '☕', img: 'photo-1510591509098-f4fdc6d0ff04', feat: true },
  { cat: 1, name: 'Ristretto Solo', desc: 'Short, concentrated shot of our Ethiopian single-origin bean.', price: 3.50, emoji: '☕', img: 'photo-1514432324607-a09d9b4aefdd', feat: false },
  { cat: 1, name: 'Americano Noir', desc: 'Espresso pulled long with hot water. Bold, clean, satisfying.', price: 4.00, emoji: '☕', img: 'photo-1497515114629-f71d768fd07c', feat: false },
  { cat: 1, name: 'Espresso Panna', desc: 'Double espresso crowned with softly whipped cream and cocoa dust.', price: 4.80, emoji: '☕', img: 'photo-1485808191679-5f86510681a2', feat: false },
  { cat: 2, name: "Latte d'Or", desc: 'Silky microfoam, single-origin espresso, gold caramel, sea salt.', price: 6.50, emoji: '🥛', img: 'photo-1461023058943-07fcbe16d735', feat: true },
  { cat: 2, name: 'Vanilla Haze', desc: 'House-made vanilla syrup, oat milk microfoam, double ristretto.', price: 6.00, emoji: '🥛', img: 'photo-1534778101976-62847782c213', feat: false },
  { cat: 2, name: 'Spiced Cortado', desc: 'Equal parts espresso and warm milk with cinnamon and cardamom.', price: 5.50, emoji: '🥛', img: 'photo-1572442388796-11668a67e53d', feat: false },
  { cat: 2, name: 'Honey Oat Flat White', desc: 'Velvety flat white sweetened with raw honey and steamed oat milk.', price: 5.80, emoji: '🥛', img: 'photo-1541167760496-1628856ab772', feat: false },
  { cat: 2, name: 'Caramel Macchiato Cloud', desc: 'Layered vanilla milk, bold espresso and a slow caramel drizzle.', price: 6.40, emoji: '🥛', img: 'photo-1497935586351-b67a49e012bf', feat: false },
  { cat: 2, name: 'Hazelnut Silk Latte', desc: 'Roasted hazelnut praline swirled through silky steamed milk.', price: 6.10, emoji: '🥛', img: 'photo-1517487881594-2787fef5ebf7', feat: false },
  { cat: 3, name: 'Midnight Reserve', desc: '48-hour cold steeped Colombian, hand-carved ice, vanilla foam.', price: 7.00, emoji: '🧊', img: 'photo-1495474472287-4d71bcdd2085', feat: true },
  { cat: 3, name: 'Nitro Black', desc: 'Nitrogen-infused cold brew on tap. Creamy and dangerously drinkable.', price: 7.50, emoji: '🧊', img: 'photo-1461988320302-91bde64fc8e4', feat: false },
  { cat: 3, name: 'Salted Caramel Cold', desc: 'Cold brew over ice, house salted caramel, oat milk.', price: 7.00, emoji: '🧊', img: 'photo-1524350876685-274059332603', feat: false },
  { cat: 3, name: 'Iced Vanilla Cloud', desc: 'Cold milk, vanilla bean and espresso poured over crystal ice.', price: 6.80, emoji: '🧊', img: 'photo-1517701550927-30cf4ba1dba5', feat: false },
  { cat: 3, name: 'Coconut Cold-Foam Brew', desc: 'Slow-steeped cold brew topped with whipped coconut cream.', price: 7.20, emoji: '🧊', img: 'photo-1556679343-c7306c1976bc', feat: false },
  { cat: 3, name: 'Espresso Tonic Fizz', desc: 'Bright espresso over chilled tonic, ice and an orange twist.', price: 6.50, emoji: '🧊', img: 'photo-1447933601403-0c6688de566e', feat: false },
  { cat: 4, name: 'Ethiopian Yirgacheffe', desc: 'Floral, fruity — jasmine, bergamot, wild blueberry.', price: 8.00, emoji: '🫖', img: 'photo-1442512595331-e89e73853f31', feat: true },
  { cat: 4, name: 'Colombian Supremo', desc: 'Rich caramel sweetness — red apple, brown sugar.', price: 7.50, emoji: '🫖', img: 'photo-1559056199-641a0ac8b55e', feat: false },
  { cat: 4, name: 'Rwandan Nyamasheke', desc: "From the shores of Lake Kivu — honeyed, floral, tea-like finish.", price: 8.50, emoji: '🫖', img: 'photo-1459755486867-b55449bb39ff', feat: false },
  { cat: 4, name: 'Guatemala Antigua Reserve', desc: 'Deep chocolate and spice with a gentle smoky sweetness.', price: 8.00, emoji: '🫖', img: 'photo-1504630083234-14187a9df0f5', feat: false },

  // ── BAKERY (20) ──
  { cat: 5, name: 'Almond Croissant', desc: 'Flaky, buttery, filled with house-made almond cream.', price: 4.50, emoji: '🥐', img: 'photo-1555507036-ab1f4038808a', feat: true },
  { cat: 5, name: 'Dark Choc Brownie', desc: 'Dense, fudgy, 70% Rwandan cacao. A dangerous companion.', price: 3.50, emoji: '🍫', img: 'photo-1606313564200-e75d5e30476c', feat: false },
  { cat: 5, name: 'Cinnamon Roll', desc: 'Soft, pillowy swirl of warm cinnamon glaze.', price: 3.00, emoji: '🥯', img: 'photo-1603532648955-039310d9ed75', feat: false },
  { cat: 5, name: 'Banana Bread Slice', desc: 'Moist, toasty, studded with walnuts.', price: 2.80, emoji: '🍞', img: 'photo-1567620905732-2d1ec7ab7445', feat: false },
  { cat: 5, name: 'Salted Caramel Cake', desc: 'Layers of caramel sponge with a sea-salt finish.', price: 4.20, emoji: '🍰', img: 'photo-1578985545062-69928b1d9587', feat: false },
  { cat: 5, name: 'Butter Croissant', desc: 'Classic laminated layers, baked golden every morning.', price: 3.20, emoji: '🥐', img: 'photo-1571115177098-24ec42ed204d', feat: false },
  { cat: 5, name: 'Blueberry Muffin', desc: 'Bursting with wild blueberries and a crunchy sugar top.', price: 3.40, emoji: '🧁', img: 'photo-1571506165871-ee72a35bc9d4', feat: false },
  { cat: 5, name: 'Chocolate Chip Cookies', desc: 'Crisp edges, molten centres, Belgian chocolate chunks.', price: 2.50, emoji: '🍪', img: 'photo-1499636136210-6f4ee915583e', feat: false },
  { cat: 5, name: 'Sourdough Loaf', desc: 'Slow-fermented 24 hours — crackling crust, tangy crumb.', price: 5.00, emoji: '🍞', img: 'photo-1556040220-4096d522378d', feat: false },
  { cat: 5, name: 'Fresh Baguette', desc: 'Shatteringly crisp crust, soft airy heart. Baked twice daily.', price: 2.20, emoji: '🥖', img: 'photo-1509365465985-25d11c17e812', feat: false },
  { cat: 5, name: 'Red Velvet Slice', desc: 'Cocoa sponge, cream-cheese frosting, a whisper of vanilla.', price: 4.80, emoji: '🍰', img: 'photo-1590080875515-8a3a8dc5735e', feat: false },
  { cat: 5, name: 'Strawberry Cream Cake', desc: 'Light chiffon, fresh strawberries, softly whipped cream.', price: 5.20, emoji: '🍰', img: 'photo-1565958011703-44f9829ba187', feat: false },
  { cat: 5, name: 'Chocolate Fudge Cake', desc: 'Triple-layer dark chocolate with a glossy ganache finish.', price: 4.90, emoji: '🍫', img: 'photo-1624353365286-3f8d62daad51', feat: false },
  { cat: 5, name: 'Cupcake Duo', desc: 'Two mini treats — salted caramel and classic vanilla.', price: 3.60, emoji: '🧁', img: 'photo-1486427944299-d1955d23e34d', feat: false },
  { cat: 5, name: 'Glazed Donut', desc: 'Pillowy brioche donut dipped in vanilla-bean glaze.', price: 2.40, emoji: '🍩', img: 'photo-1551106652-a5bcf4b29ab6', feat: false },
  { cat: 5, name: 'Macaron Selection', desc: 'Six delicate shells — pistachio, raspberry, salted caramel.', price: 6.50, emoji: '🍬', img: 'photo-1569864358642-9d1684040f43', feat: false },
  { cat: 5, name: 'NY Cheesecake Slice', desc: 'Dense, creamy baked cheesecake on a buttery biscuit base.', price: 4.60, emoji: '🍰', img: 'photo-1568827999250-3f6afff96e66', feat: false },
  { cat: 5, name: 'Fruit Danish', desc: 'Flaky pastry, vanilla custard and a seasonal fruit crown.', price: 3.30, emoji: '🥮', img: 'photo-1528207776546-365bb710ee93', feat: false },
  { cat: 5, name: 'Waffle Royale', desc: 'Golden Belgian waffle, berries, maple and chantilly cream.', price: 5.50, emoji: '🧇', img: 'photo-1535920527002-b35e96722eb9', feat: false },
  { cat: 5, name: 'French Toast Brunch', desc: 'Thick-cut brioche, cinnamon egg wash, warm maple syrup.', price: 6.00, emoji: '🍞', img: 'photo-1484723091739-30a097e8f929', feat: false }
];

// Demo promo video for Login / Sign-up (admin can upload/activate another any time).
const DEMO_VIDEO = { filename: 'Coffee pour — promo', url: 'https://assets.mixkit.co/videos/43941/43941-720.mp4' };

async function main() {
  const conn = await mysql.createConnection({
    host: cfg.db.host, port: cfg.db.port, user: cfg.db.user,
    password: cfg.db.password, database: cfg.db.database, ssl: cfg.db.ssl
  });
  let added = 0, refreshed = 0;
  for (const it of ITEMS) {
    const img = U(it.img);
    const [rows] = await conn.query('SELECT id,image FROM products WHERE name=? LIMIT 1', [it.name]);
    if (rows.length) {
      const cur = String(rows[0].image || '');
      if (cur.includes('unsplash') && cur !== img) {
        await conn.query('UPDATE products SET image=?, available=1 WHERE id=?', [img, rows[0].id]);
        refreshed++;
      }
      continue;
    }
    await conn.query(
      'INSERT INTO products (cat_id,name,description,price,emoji,image,available,featured) VALUES (?,?,?,?,?,?,1,?)',
      [it.cat, it.name, it.desc, it.price, it.emoji, img, it.feat ? 1 : 0]
    );
    added++;
  }
  const [vids] = await conn.query('SELECT COUNT(*) n FROM auth_videos');
  if (vids[0].n === 0) {
    await conn.query('INSERT INTO auth_videos (filename,url,active) VALUES (?,?,1)', [DEMO_VIDEO.filename, DEMO_VIDEO.url]);
    console.log('auth_videos: activated the demo promo video');
  }
  console.log('seed-products: ' + added + ' added, ' + refreshed + ' images refreshed.');
  await conn.end();
}

main().catch(e => {
  console.error('Seed failed: ' + e.message);
  console.error('Is MySQL running? (Start it in XAMPP Control Panel)');
  process.exit(1);
});
