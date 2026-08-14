-- ============================================================
-- MOOD Coffee Shop & Bakery  -  MySQL/MariaDB schema + seed
-- Import:  node setup.js   (or mysql -u root < moodcoffee.sql)
-- ============================================================

CREATE DATABASE IF NOT EXISTS moodcoffee CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE moodcoffee;

-- ---------- Admins (separate from customers) ----------
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS giftcards;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS auth_videos;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS promos;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS newsletter;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS settings;

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'staff',
  permissions VARCHAR(500) DEFAULT '[]',
  status TINYINT(1) DEFAULT 1,
  last_login DATETIME DEFAULT NULL,
  pass_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30) DEFAULT '',
  pass_hash VARCHAR(255) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  image TEXT DEFAULT NULL,
  sort INT DEFAULT 0,
  service VARCHAR(20) DEFAULT 'coffee'
) ENGINE=InnoDB;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cat_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) DEFAULT '',
  price DECIMAL(8,2) NOT NULL DEFAULT 0,
  emoji VARCHAR(8) DEFAULT '☕',
  image TEXT DEFAULT NULL,
  available TINYINT(1) DEFAULT 1,
  featured TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cat_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ref VARCHAR(20) NOT NULL UNIQUE,
  user_id INT DEFAULT NULL,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(255) NOT NULL,
  notes VARCHAR(500) DEFAULT '',
  subtotal DECIMAL(8,2) NOT NULL DEFAULT 0,
  discount DECIMAL(8,2) DEFAULT 0,
  total DECIMAL(8,2) NOT NULL DEFAULT 0,
  payment VARCHAR(20) NOT NULL DEFAULT 'paypal',
  status VARCHAR(20) NOT NULL DEFAULT 'Preparing',
  points_earned INT DEFAULT 0,
  points_used INT DEFAULT 0,
  gift_code VARCHAR(24) DEFAULT NULL,
  gift_amount DECIMAL(8,2) DEFAULT 0,
  tx_id VARCHAR(64) DEFAULT NULL,
  charge_id VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  name VARCHAR(120) NOT NULL,
  price DECIMAL(8,2) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  emoji VARCHAR(8) DEFAULT '☕',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE promos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  discount INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message VARCHAR(500) NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE newsletter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(80) DEFAULT '',
  prefs VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  customer_name VARCHAR(80) NOT NULL,
  rating TINYINT NOT NULL DEFAULT 5,
  comment VARCHAR(500) DEFAULT '',
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  name VARCHAR(80) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  guests INT NOT NULL DEFAULT 1,
  res_date DATE NOT NULL,
  res_time VARCHAR(10) NOT NULL,
  notes VARCHAR(500) DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE giftcards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(24) NOT NULL UNIQUE,
  amount DECIMAL(8,2) NOT NULL,
  balance DECIMAL(8,2) NOT NULL,
  buyer_name VARCHAR(80) DEFAULT '',
  buyer_email VARCHAR(120) DEFAULT '',
  message VARCHAR(500) DEFAULT '',
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE rewards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  code VARCHAR(24) NOT NULL UNIQUE,
  title VARCHAR(60) NOT NULL,
  value DECIMAL(8,2) NOT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redeemed_at DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL DEFAULT '',
  message VARCHAR(1000) NOT NULL,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE auth_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(200) NOT NULL DEFAULT 'Video',
  url TEXT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE sessions (
  token CHAR(64) PRIMARY KEY,
  user_type VARCHAR(10) NOT NULL,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  last_active DATETIME DEFAULT NULL,
  ip VARCHAR(45) DEFAULT '',
  ua VARCHAR(255) DEFAULT '',
  INDEX idx_exp (expires_at)
) ENGINE=InnoDB;

CREATE TABLE settings (
  id TINYINT PRIMARY KEY,
  store_name VARCHAR(120) DEFAULT 'MOOD Coffee Shop & Bakery',
  tagline VARCHAR(200) DEFAULT 'Coffee, Bakery & Good Vibes',
  email VARCHAR(120) DEFAULT 'hello@moodcoffee.rw',
  phone VARCHAR(30) DEFAULT '+250 788 000 000',
  address VARCHAR(255) DEFAULT 'Kigali, Rwanda',
  currency VARCHAR(8) DEFAULT 'USD',
  free_delivery DECIMAL(8,2) DEFAULT 0,
  delivery_fee DECIMAL(8,2) DEFAULT 0,
  delivery_time VARCHAR(60) DEFAULT '20-35 minutes',
  delivery_zones VARCHAR(255) DEFAULT 'Kigali City Centre',
  toggles VARCHAR(500) DEFAULT '{}',
  lock_minutes INT DEFAULT 5,
  points_value DECIMAL(8,4) DEFAULT 0.0100,
  loyalty_threshold INT NOT NULL DEFAULT 100,
  smtp_json VARCHAR(2000) DEFAULT NULL,
  max_review_len INT DEFAULT 300
) ENGINE=InnoDB;

-- ---------- Site section images ----------
CREATE TABLE banners (
  bkey VARCHAR(40) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  url TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO banners (bkey, label, url) VALUES
('hero', 'Landing — hero background', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&q=90&auto=format&fit=crop'),
('about', 'Our Story section', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=900&q=85&auto=format&fit=crop'),
('quote', 'Quote background', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1920&q=85&auto=format&fit=crop'),
('visit', 'Visit / location section', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=900&q=85&auto=format&fit=crop'),
('svc_bg', 'Service picker background', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=80&auto=format&fit=crop'),
('svc_coffee', 'Service picker — Coffee card', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=80&auto=format&fit=crop'),
('svc_bakery', 'Service picker — Bakery card', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80&auto=format&fit=crop'),
('shop_banner', 'Order menu banner', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1600&q=85&auto=format&fit=crop');

-- ---------- Seed: categories ----------
INSERT INTO categories (id, name, image, sort, service) VALUES
(1, 'Espresso', 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=300&q=75&auto=format&fit=crop', 1, 'coffee'),
(2, 'Lattes', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&q=75&auto=format&fit=crop', 2, 'coffee'),
(3, 'Cold Brew', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&q=75&auto=format&fit=crop', 3, 'coffee'),
(4, 'Pour Over', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=300&q=75&auto=format&fit=crop', 4, 'coffee'),
(5, 'Bakery', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=75&auto=format&fit=crop', 5, 'bakery');

-- ---------- Seed: products ----------
INSERT INTO products (cat_id, name, description, price, emoji, image, available, featured) VALUES
(1, 'Doppio Classico', 'Double shot house blend — dark chocolate, toasted walnut, orange zest.', 4.50, '☕', 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&q=80&auto=format&fit=crop', 1, 1),
(1, 'Ristretto Solo', 'Short, concentrated shot of our Ethiopian single-origin bean.', 3.50, '☕', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80&auto=format&fit=crop', 1, 0),
(1, 'Americano Noir', 'Espresso pulled long with hot water. Bold, clean, satisfying.', 4.00, '☕', 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=500&q=80&auto=format&fit=crop', 1, 0),
(2, 'Latte d''Or', 'Silky microfoam, single-origin espresso, gold caramel, sea salt.', 6.50, '🥛', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500&q=80&auto=format&fit=crop', 1, 1),
(2, 'Vanilla Haze', 'House-made vanilla syrup, oat milk microfoam, double ristretto.', 6.00, '🥛', 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&q=80&auto=format&fit=crop', 1, 0),
(2, 'Spiced Cortado', 'Equal parts espresso and warm milk with cinnamon and cardamom.', 5.50, '🥛', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=500&q=80&auto=format&fit=crop', 1, 0),
(3, 'Midnight Reserve', '48-hour cold steeped Colombian, hand-carved ice, vanilla foam.', 7.00, '🧊', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80&auto=format&fit=crop', 1, 1),
(3, 'Nitro Black', 'Nitrogen-infused cold brew on tap. Creamy and dangerously drinkable.', 7.50, '🧊', 'https://images.unsplash.com/photo-1581996323441-5861b53eb8b5?w=500&q=80&auto=format&fit=crop', 1, 0),
(3, 'Salted Caramel Cold', 'Cold brew over ice, house salted caramel, oat milk.', 7.00, '🧊', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=80&auto=format&fit=crop', 1, 0),
(4, 'Ethiopian Yirgacheffe', 'Floral, fruity — jasmine, bergamot, wild blueberry.', 8.00, '🫖', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500&q=80&auto=format&fit=crop', 1, 1),
(4, 'Colombian Supremo', 'Rich caramel sweetness — red apple, brown sugar.', 7.50, '🫖', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&q=80&auto=format&fit=crop', 1, 0),
(5, 'Almond Croissant', 'Flaky, buttery, filled with house-made almond cream.', 4.50, '🥐', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80&auto=format&fit=crop', 1, 1),
(5, 'Dark Choc Brownie', 'Dense, fudgy, 70% Rwandan cacao. A dangerous companion.', 3.50, '🍫', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&q=80&auto=format&fit=crop', 1, 0),
(5, 'Cinnamon Roll', 'Soft, pillowy swirl of warm cinnamon glaze.', 3.00, '🥯', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80&auto=format&fit=crop', 1, 0),
(5, 'Banana Bread Slice', 'Moist, toasty, studded with walnuts.', 2.80, '🍞', 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&q=80&auto=format&fit=crop', 1, 0),
(5, 'Salted Caramel Cake', 'Layers of caramel sponge with a sea-salt finish.', 4.20, '🍰', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80&auto=format&fit=crop', 1, 0);

-- ---------- Seed: settings ----------
INSERT INTO settings (id, toggles, points_value) VALUES (1, '{"ord":true,"reg":true,"opay":true,"pp":true,"mtn":true,"airtel":true,"card":true,"maint":false,"loyalty":true,"lang_en":true,"lang_fr":true,"lang_rw":true}', 0.0100);

-- ---------- Seed: promo (optional) ----------
INSERT INTO promos (code, discount) VALUES ('MOOD10', 10);
