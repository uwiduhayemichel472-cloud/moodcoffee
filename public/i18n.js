/* ════════════════════════════════════════════════════════════════════
   SOCIAL MEDIA LINKS — MOOD Coffee Shop & Bakery
   ─────────────────────────────────────────────────────────────────────
   ▸ THIS IS THE ONLY PLACE you need to change them.
   ▸ Update the URLs below to your OFFICIAL pages, and every page of the
     website (homepage, online shop, maintenance page) updates instantly.
   ▸ The WhatsApp number must be the full number incl. country code.
   ════════════════════════════════════════════════════════════════════ */
const SOCIAL = {
  instagram: 'https://www.instagram.com/ablackadabla/',  // ← your Instagram
  facebook:  'https://www.facebook.com/yourpage',          // ← your Facebook
  tiktok:    'https://www.tiktok.com/@yourhandle',         // ← your TikTok
  whatsapp:  '+250700000000'                               // ← your WhatsApp number
};
const WA_NUM = (SOCIAL.whatsapp || '').replace(/[^\d]/g, '');
const WA_LINK = WA_NUM ? 'https://wa.me/' + WA_NUM : '#';

// Expose to every page. (Top-level `const` does NOT attach to window, so we
// attach it explicitly — this is what makes the footer links clickable.)
window.SOCIAL = SOCIAL;
window.SOCIAL_URL = function (key) { return key === 'whatsapp' ? WA_LINK : (SOCIAL[key] || ''); };

/* MOOD Coffee Shop & Bakery — Translation system (EN / FR / RW) */
const I18N = (function () {
  const STORAGE_KEY = 'mood_lang';
  const ENABLED_KEY = 'mood_lang_enabled';

  const DICT = {
    en: {
      /* Nav */
      nav_home: 'Home',
      nav_story: 'Our Story',
      nav_menu: 'Menu',
      nav_why: 'Why Us',
      nav_visit: 'Visit',
      nav_order: 'Order Online',
      nav_myorders: 'My Orders',
      nav_cart: 'Cart',
      nav_login: 'Login',
      nav_signup: 'Sign Up',
      nav_logout: 'Logout',
      nav_account: 'My Account',

      /* Hero */
      hero_eyebrow: 'Est. 2018 · Coffee & Bakery',
      hero_title1: 'Good Coffee.',
      hero_title2: 'Great Mood.',
      hero_sub: 'Freshly roasted single-origin coffee and baked-from-scratch pastries, served warm with a side of good energy — right here in Kigali.',
      hero_order: 'Order Now',
      hero_menu: 'See the Menu',

      /* Marquee */
      mq1: 'Single Origin Espresso',
      mq2: 'Cold Brew Reserve',
      mq3: 'Fresh Bakery Daily',
      mq4: 'Pour Over Ceremony',
      mq5: 'Ethiopian Yirgacheffe',

      /* About */
      about_lbl: 'Our Philosophy',
      about_title1: 'Crafted with',
      about_title2: 'Baked with Soul',
      about_p1: 'We believe great coffee and bread are not accidents. Beans are sourced from small family farms, roasted in small batches, and pastries are baked fresh every morning.',
      about_p2: 'Step inside, slow down, and taste the difference that care makes.',
      stat_origins: 'Origins Sourced',
      stat_years: 'Years Roasting',
      stat_cups: 'Cups Served',

      /* Mission */
      mission_lbl: 'Mission & Goals',
      mission_t1: 'Why We',
      mission_brew: 'Brew,',
      mission_t2: 'Why We Bake',
      mission_body: 'Our mission is simple: to make exceptional coffee and honest, freshly-baked food part of everyday life in Kigali — while treating the people behind every bean and every loaf with respect.',
      goal1_t: 'Serve the freshest cup',
      goal1_d: 'Small-batch roasting and grinding only what we use each day.',
      goal2_t: 'Bake from scratch, daily',
      goal2_d: 'Pastries and breads made by hand every single morning.',
      goal3_t: 'Support local growers',
      goal3_d: 'Fair prices for Rwandan and East African coffee farmers.',
      goal4_t: 'Build community',
      goal4_d: 'A warm, welcoming space where everyone feels at home.',

      /* Menu */
      menu_lbl: 'Signature Drinks',
      menu_t1: 'The',
      menu_t2: 'Ritual',
      menu_t3: 'Menu',

      /* Why us */
      why_lbl: 'Why Choose Us',
      why_t1: 'Made with',
      why_t2: 'Kept with Care.',
      why1_t: 'Single-Origin',
      why1_t2: 'Coffee',
      why1_d: 'Beans from small family farms, roasted in small batches for a bright, balanced cup.',
      why2_t: 'Baked',
      why2_t2: 'Fresh Daily',
      why2_d: 'Croissants, sourdough and cakes made from scratch every morning — never frozen.',
      why3_t: 'Fast &',
      why3_t2: 'Warm',
      why3_d: 'Order online and we\'ll have your coffee and bakes ready before you arrive.',
      why4_t: 'Local &',
      why4_t2: 'Fair',
      why4_d: 'Supporting Rwandan growers and local suppliers with every single purchase.',

      /* Experience */
      exp_quote: '"The best coffee is the one you drink slowly, in a place that makes you feel truly alive."',

      /* Visit */
      visit_lbl: 'Come Find Us',
      visit_t1: 'Hours &',
      visit_t2: 'Location',
      day_mon_fri: 'Monday – Friday',
      day_sat: 'Saturday',
      day_sun: 'Sunday',

      /* Map */
      map_lbl: 'Find Us on the Map',
      map_t1: 'Right in the',
      map_t2: 'Heart of Kigali',

      /* Newsletter */
      news_lbl: 'Stay in the Loop',
      news_t1: 'Join the',
      news_t2: 'Mood.',
      news_sub: 'Share your email and your favourite roast — we\'ll send a personal welcome and coffee recommendation.',
      news_name: 'Your name',
      news_email: 'your@email.com',
      news_join: 'Join',
      news_ok: 'Welcome to the MOOD! Check your inbox soon.',
      news_err: 'Something went wrong. Please try again.',

      /* Footer */
      footer_explore: 'Explore',
      footer_order: 'Order Online',
      footer_connect: 'Connect',
      footer_rights: 'All rights reserved.',
      footer_made: 'Made with love in Kigali ☕',

      /* Language */
      lang_label: 'Language',

      /* Shop */
      shop_title: 'Order Online — MOOD Coffee Shop & Bakery',
      shop_menubtn: 'Menu',
      shop_empty: 'Nothing here yet.',
      shop_choose_service: 'Choose a service to see the menu.',
      shop_add: 'Add to Cart',
      shop_added: 'added ✓',
      shop_login_first: 'Please login to order.',
      shop_ordering_paused: 'Online ordering is paused.',
      shop_cart_empty: 'Your cart is empty.',
      shop_remove: 'Remove',
      shop_total: 'Total',
      shop_checkout: 'Proceed to Checkout',
      shop_please_login: 'Please login first.',
      shop_payments_paused: 'Online payments are paused.',
      shop_welcome_back: 'Welcome back',
      shop_logged_out: 'Logged out.',
      shop_logout_confirm: 'Log out of your MOOD account?',
      rev_login: 'Login to write a review.',
      shop_no_orders: 'No orders yet.',
      shop_login_to_see: 'Login to see your orders.',
      shop_enter_phone: 'Enter phone and address.',
      shop_processing: 'Processing…',
      shop_placed: 'Place Order & Pay',
      shop_confirm: 'Order Confirmed!',
      shop_thanks: 'Thank you! Order',
      shop_preparing: 'is being prepared.',
      shop_total_label: 'Total:',
      shop_order_more: 'Order More',
      shop_cart_title: 'Your Cart',
      shop_paid_confirm: 'Your payment was received and your order is now being prepared.',
      shop_pay_cancelled: 'Payment was not completed — no money was taken. Your cart is still here.',

      /* Service picker */
      svc_lbl: 'Welcome to',
      svc_title: 'What service are you',
      svc_title2: 'looking for?',
      svc_sub: 'Choose one and discover everything we have in that service.',
      svc_roasted: 'Roasted Daily',
      svc_coffee_title: 'Coffee Service',
      svc_coffee_desc: 'Espresso, lattes, cold brew & pour over',
      svc_browse_coffee: 'Browse Coffee →',
      svc_baked: 'Baked Fresh Daily',
      svc_bakery_title: 'Bakery Service',
      svc_bakery_desc: 'Fresh pastries, cakes & baked goods',
      svc_browse_bakery: 'Browse Bakery →',
      svc_switch: 'Switch service',

      /* Checkout */
      co_title: 'Complete Your Order',
      co_delivery: 'Delivery Details',
      co_phone: 'Phone Number',
      co_addr: 'Delivery Address',
      co_promo: 'Promo Code (optional)',
      co_apply: 'Apply',
      co_notes: 'Order Notes',
      co_payment: 'Payment Method',
      co_summary: 'Order Summary',
      co_delivery_label: 'Delivery',
      co_discount: 'Discount',
      co_free: 'Free',
      co_secure: 'Pay securely with MTN MoMo, Airtel Money or bank card.',
      co_gateway_note: 'You will be redirected to a secure payment page to complete your order.',
      co_demo_note: 'Demo checkout — no real payment is processed.',
      co_card_secure: 'Your card details are encrypted in your browser before being sent.',
      co_momo_note: 'A payment request will be sent to this number. Have your phone ready.',
      co_card_invalid: 'Please fill your card details correctly.',
      co_card_unavailable: 'Card payments are not ready yet.',
      pay_title: 'Payment Pending',
      pay_instruction: 'Confirm the payment on your phone to finish your order.',
      pay_awaiting: 'Waiting for payment confirmation…',
      co_promo_invalid: 'Invalid promo code.',
      co_promo_ok: 'discount applied!',

      /* Auth */
      auth_welcome: 'Welcome Back',
      auth_signin: 'Sign in to place orders.',
      auth_create: 'Create Account',
      auth_join: 'Join the MOOD today.',
      auth_name: 'Full Name',
      auth_email: 'Email',
      auth_phone: 'Phone (optional)',
      auth_pass: 'Password',
      auth_login_btn: 'Login',
      auth_create_btn: 'Create Account',
      auth_no_account: 'No account?',
      auth_signup_free: 'Sign up free',
      auth_have_account: 'Have an account?',
      auth_login2: 'Login',
      auth_reg_paused: 'New registrations are paused.',
      auth_welcome_toast: 'Welcome,',

      /* Account */
      acc_title: 'My Account',
      acc_profile: 'Your profile at',
      acc_name: 'Name',
      acc_email: 'Email',
      acc_phone: 'Phone',
      acc_member: 'Member since',
      acc_logout: 'Logout',

      /* Orders */
      ord_title: 'Your Orders',
      ord_processing: 'Preparing',
      ord_delivered: 'Delivered',
      ord_pending: 'Pending',
      ord_cancelled: 'Cancelled',
      ord_empty_title: 'No orders yet',
      ord_empty_sub: 'When you place your first order, it will show up here so you can follow it in real time.',
      ord_browse: 'Browse the menu',
      ord_login_title: 'Sign in to see your orders',
      ord_login_sub: 'Log in to follow your orders and reservations all in one place.'
    },

    fr: {
      /* Nav */
      nav_home: 'Accueil',
      nav_story: 'Notre Histoire',
      nav_menu: 'Menu',
      nav_why: 'Pourquoi Nous',
      nav_visit: 'Visite',
      nav_order: 'Commander en Ligne',
      nav_myorders: 'Mes Commandes',
      nav_cart: 'Panier',
      nav_login: 'Connexion',
      nav_signup: 'S\'inscrire',
      nav_logout: 'Déconnexion',
      nav_account: 'Mon Compte',

      /* Hero */
      hero_eyebrow: 'Établ. 2018 · Café & Boulangerie',
      hero_title1: 'Bon Café.',
      hero_title2: 'Bonne Humeur.',
      hero_sub: 'Café de spécialité fraîchement torréfié et pâtisseries faites maison, servis chauds avec une dose de bonne énergie — ici à Kigali.',
      hero_order: 'Commander',
      hero_menu: 'Voir le Menu',

      /* Marquee */
      mq1: 'Espresso Single Origin',
      mq2: 'Cold Brew Réserve',
      mq3: 'Boulangerie Fraîche Quotidienne',
      mq4: 'Cérémonie Pour Over',
      mq5: 'Éthiopien Yirgacheffe',

      /* About */
      about_lbl: 'Notre Philosophie',
      about_title1: 'Créé avec',
      about_title2: 'Cuit avec Âme',
      about_p1: 'Nous croyons que le bon café et le bon pain ne sont pas un hasard. Les grains sont sourcés de petites fermes familiales, torréfiés en petits lots, et les pâtisseries sont cuites fraîches chaque matin.',
      about_p2: 'Entrez, ralentissez, et goûtez la différence que fait le soin.',
      stat_origins: 'Origines Sourcées',
      stat_years: 'Années de Torréfaction',
      stat_cups: 'Tasses Servies',

      /* Mission */
      mission_lbl: 'Mission & Objectifs',
      mission_t1: 'Pourquoi Nous',
      mission_brew: 'Brassons,',
      mission_t2: 'Pourquoi Nous Cuisons',
      mission_body: 'Notre mission est simple : faire du café exceptionnel et de la nourriture honnête et fraîchement cuite une partie de la vie quotidienne à Kigali — tout en traitant les personnes derrière chaque grain et chaque pain avec respect.',
      goal1_t: 'Servir la tasse la plus fraîche',
      goal1_d: 'Torréfaction en petits lots et mouture uniquement de ce que nous utilisons chaque jour.',
      goal2_t: 'Cuire de zéro, chaque jour',
      goal2_d: 'Pâtisseries et pains faits à la main chaque matin.',
      goal3_t: 'Soutenir les producteurs locaux',
      goal3_d: 'Prix équitables pour les caféiculteurs rwandais et d\'Afrique de l\'Est.',
      goal4_t: 'Construire une communauté',
      goal4_d: 'Un espace chaleureux et accueillant où chacun se sent chez soi.',

      /* Menu */
      menu_lbl: 'Boissons Signature',
      menu_t1: 'Le',
      menu_t2: 'Rituel',
      menu_t3: 'Menu',

      /* Why us */
      why_lbl: 'Pourquoi Nous Choisir',
      why_t1: 'Fait avec',
      why_t2: 'Gardé avec Soin.',
      why1_t: 'Café',
      why1_t2: 'Single-Origin',
      why1_d: 'Des grains de petites fermes familiales, torréfiés en petits lots pour une tasse lumineuse et équilibrée.',
      why2_t: 'Cuit',
      why2_t2: 'Frais Chaque Jour',
      why2_d: 'Croissants, pains au levain et gâteaux faits de zéro chaque matin — jamais congelés.',
      why3_t: 'Rapide &',
      why3_t2: 'Chaleureux',
      why3_d: 'Commandez en ligne et votre café et vos pâtisseries seront prêts avant votre arrivée.',
      why4_t: 'Local &',
      why4_t2: 'Équitable',
      why4_d: 'Nous soutenons les producteurs rwandais et les fournisseurs locaux à chaque achat.',

      /* Experience */
      exp_quote: '"Le meilleur café est celui que l\'on boit lentement, dans un endroit qui vous fait sentir vraiment vivant."',

      /* Visit */
      visit_lbl: 'Venez Nous Trouver',
      visit_t1: 'Horaires &',
      visit_t2: 'Emplacement',
      day_mon_fri: 'Lundi – Vendredi',
      day_sat: 'Samedi',
      day_sun: 'Dimanche',

      /* Map */
      map_lbl: 'Trouvez-Nous sur la Carte',
      map_t1: 'Au Cœur de',
      map_t2: 'Kigali',

      /* Newsletter */
      news_lbl: 'Restez Connecté',
      news_t1: 'Rejoignez le',
      news_t2: 'Mood.',
      news_sub: 'Partagez votre email et votre torréfaction préférée — nous enverrons un accueil personnel et une recommandation de café.',
      news_name: 'Votre nom',
      news_email: 'votre@email.com',
      news_join: 'Rejoindre',
      news_ok: 'Bienvenue au MOOD ! Vérifiez bientôt votre boîte de réception.',
      news_err: 'Une erreur est survenue. Veuillez réessayer.',

      /* Footer */
      footer_explore: 'Explorer',
      footer_order: 'Commander en Ligne',
      footer_connect: 'Connecter',
      footer_rights: 'Tous droits réservés.',
      footer_made: 'Fait avec amour à Kigali ☕',

      /* Language */
      lang_label: 'Langue',

      /* Shop */
      shop_title: 'Commander en Ligne — MOOD Coffee Shop & Bakery',
      shop_menubtn: 'Menu',
      shop_empty: 'Rien ici pour le moment.',
      shop_choose_service: 'Choisissez un service pour voir le menu.',
      shop_add: 'Ajouter au Panier',
      shop_added: 'ajouté ✓',
      shop_login_first: 'Veuillez vous connecter pour commander.',
      shop_ordering_paused: 'La commande en ligne est en pause.',
      shop_cart_empty: 'Votre panier est vide.',
      shop_remove: 'Retirer',
      shop_total: 'Total',
      shop_checkout: 'Passer à la Caisse',
      shop_please_login: 'Veuillez d\'abord vous connecter.',
      shop_payments_paused: 'Les paiements en ligne sont en pause.',
      shop_welcome_back: 'Bon retour',
      shop_logged_out: 'Déconnecté.',
      shop_logout_confirm: 'Vous déconnecter de votre compte MOOD ?',
      rev_login: 'Connectez-vous pour laisser un avis.',
      shop_no_orders: 'Aucune commande pour le moment.',
      shop_login_to_see: 'Connectez-vous pour voir vos commandes.',
      shop_enter_phone: 'Entrez le téléphone et l\'adresse.',
      shop_processing: 'Traitement…',
      shop_placed: 'Passer la Commande & Payer',
      shop_confirm: 'Commande Confirmée !',
      shop_thanks: 'Merci ! Commande',
      shop_preparing: 'est en préparation.',
      shop_total_label: 'Total :',
      shop_order_more: 'Commander Plus',
      shop_cart_title: 'Votre Panier',
      shop_paid_confirm: 'Votre paiement a été reçu et votre commande est en cours de préparation.',
      shop_pay_cancelled: 'Paiement non effectué — aucun argent n\'a été prélevé. Votre panier est toujours là.',

      /* Service picker */
      svc_lbl: 'Bienvenue chez',
      svc_title: 'Quel service',
      svc_title2: 'cherchez-vous ?',
      svc_sub: 'Choisissez-en un et découvrez tout ce que nous avons dans ce service.',
      svc_roasted: 'Torréfié Quotidiennement',
      svc_coffee_title: 'Service Café',
      svc_coffee_desc: 'Espresso, lattes, cold brew & pour over',
      svc_browse_coffee: 'Parcourir le Café →',
      svc_baked: 'Cuit Frais Chaque Jour',
      svc_bakery_title: 'Service Boulangerie',
      svc_bakery_desc: 'Pâtisseries fraîches, gâteaux & produits de boulangerie',
      svc_browse_bakery: 'Parcourir la Boulangerie →',
      svc_switch: 'Changer de service',

      /* Checkout */
      co_title: 'Complétez Votre Commande',
      co_delivery: 'Détails de Livraison',
      co_phone: 'Numéro de Téléphone',
      co_addr: 'Adresse de Livraison',
      co_promo: 'Code Promo (optionnel)',
      co_apply: 'Appliquer',
      co_notes: 'Notes de Commande',
      co_payment: 'Méthode de Paiement',
      co_summary: 'Résumé de la Commande',
      co_delivery_label: 'Livraison',
      co_discount: 'Remise',
      co_free: 'Gratuit',
      co_secure: 'Payez en toute sécurité avec MTN MoMo, Airtel Money ou carte bancaire.',
      co_gateway_note: 'Vous serez redirigé vers une page de paiement sécurisée pour finaliser votre commande.',
      co_demo_note: 'Paiement de démonstration — aucun paiement réel n\'est traité.',
      co_card_secure: 'Vos données de carte sont chiffrées dans votre navigateur avant l\'envoi.',
      co_momo_note: 'Une demande de paiement sera envoyée à ce numéro. Ayez votre téléphone à portée de main.',
      co_card_invalid: 'Veuillez remplir correctement les informations de votre carte.',
      co_card_unavailable: 'Les paiements par carte ne sont pas encore disponibles.',
      pay_title: 'Paiement en attente',
      pay_instruction: 'Confirmez le paiement sur votre téléphone pour terminer votre commande.',
      pay_awaiting: 'En attente de confirmation du paiement…',
      co_promo_invalid: 'Code promo invalide.',
      co_promo_ok: 'de remise appliquée !',

      /* Auth */
      auth_welcome: 'Bon Retour',
      auth_signin: 'Connectez-vous pour passer des commandes.',
      auth_create: 'Créer un Compte',
      auth_join: 'Rejoignez le MOOD aujourd\'hui.',
      auth_name: 'Nom Complet',
      auth_email: 'Email',
      auth_phone: 'Téléphone (optionnel)',
      auth_pass: 'Mot de Passe',
      auth_login_btn: 'Connexion',
      auth_create_btn: 'Créer un Compte',
      auth_no_account: 'Pas de compte ?',
      auth_signup_free: 'Inscrivez-vous gratuitement',
      auth_have_account: 'Vous avez un compte ?',
      auth_login2: 'Connexion',
      auth_reg_paused: 'Les nouvelles inscriptions sont en pause.',
      auth_welcome_toast: 'Bienvenue,',

      /* Account */
      acc_title: 'Mon Compte',
      acc_profile: 'Votre profil chez',
      acc_name: 'Nom',
      acc_email: 'Email',
      acc_phone: 'Téléphone',
      acc_member: 'Membre depuis',
      acc_logout: 'Déconnexion',

      /* Orders */
      ord_title: 'Vos Commandes',
      ord_processing: 'En Préparation',
      ord_delivered: 'Livré',
      ord_pending: 'En Attente',
      ord_cancelled: 'Annulé',
      ord_empty_title: 'Aucune commande pour l\'instant',
      ord_empty_sub: 'Dès que vous passerez votre première commande, elle apparaîtra ici pour que vous puissiez la suivre en temps réel.',
      ord_browse: 'Voir le menu',
      ord_login_title: 'Connectez-vous pour voir vos commandes',
      ord_login_sub: 'Connectez-vous pour suivre vos commandes et réservations au même endroit.'
    },

    rw: {
      /* Nav */
      nav_home: 'Ahabanza',
      nav_story: 'Amateka Yacu',
      nav_menu: 'Menu',
      nav_why: 'Kubera Iki',
      nav_visit: 'Sura',
      nav_order: 'Tumiza kuri Interineti',
      nav_myorders: 'Ibyo Natanze',
      nav_cart: 'Igikarito',
      nav_login: 'Injira',
      nav_signup: 'Iyandikishe',
      nav_logout: 'Sohoka',
      nav_account: 'Konti Yanjye',

      /* Hero */
      hero_eyebrow: 'Ishinzwe 2018 · Ikawa & Amakate',
      hero_title1: 'Ikawa Nziza.',
      hero_title2: 'Umutima Mwiza.',
      hero_sub: 'Ikawa idasanzwe yatetswe vuba n\'amateka mashya yakozwe kuva mu ntangiriro, bikabikwa ashyushye hamwe n\'imbaraga nziza — hano i Kigali.',
      hero_order: 'Tumiza Nonaha',
      hero_menu: 'Reba Menu',

      /* Marquee */
      mq1: 'Espresso Single Origin',
      mq2: 'Cold Brew Reserve',
      mq3: 'Amateka Mashya Buri Munsi',
      mq4: 'Pour Over Ceremony',
      mq5: 'Etiyopiya Yirgacheffe',

      /* About */
      about_lbl: 'Falsafiya Yacu',
      about_title1: 'Yakozwe na',
      about_title2: 'yatetswe n\'umutima',
      about_p1: 'Twizera ko ikawa nziza n\'umugati mwiza bidaturuka ku mpanuka. Impeke zituruka ku mirima mito y\'imiryango, zikababwa mu bice bito, n\'amateka akabikwa mashya buri gitondo.',
      about_p2: 'Injira, ihagarare, unywe akamaro ko kwita ku bintu.',
      stat_origins: 'Inkomoko Ziturutse',
      stat_years: 'Imyaka Turi Kubaba',
      stat_cups: 'Ibikombe Twatanze',

      /* Mission */
      mission_lbl: 'Intego & Ibyo Dukora',
      mission_t1: 'Kubera Iki',
      mission_brew: 'Tuteka,',
      mission_t2: 'Tuteka Amakate',
      mission_body: 'Intego yacu ni yoroshye: gukora ikawa idasanzwe n\'ibiryo byiza byatetswe vuba bibe igice cy\'ubuzima bwa buri munsi i Kigali — twubaha abantu bari inyuma ya buri mpeke n\'urwo buri mugaati.',
      goal1_t: 'Tanga ikikombe gishya',
      goal1_d: 'Gusya no gukaraba mu bice bito, gusa ibyo dukoresha buri munsi.',
      goal2_t: 'Teka kuva mu ntangiriro, buri munsi',
      goal2_d: 'Amakate n\'ibikomoka byikorwa intoki buri gitondo.',
      goal3_t: 'Shyigikira abahinzi b\'ahantu',
      goal3_d: 'Ibiciro byingana ku bahinzi b\'ikawa b\'u Rwanda n\'iburasirazuba bwa Afurika.',
      goal4_t: 'Baka umuryango',
      goal4_d: 'Aho ushobora kumva uri mu rugo, kandi wowe n\'abandi mugaragare.',

      /* Menu */
      menu_lbl: 'Ibyo Kunywa By\'umwimerere',
      menu_t1: 'Menu',
      menu_t2: 'ya',
      menu_t3: 'Gakondo',

      /* Why us */
      why_lbl: 'Kubera Iki Uduhitire',
      why_t1: 'Byakozwe na',
      why_t2: 'Bibikwa n\'Urukundo.',
      why1_t: 'Single-Origin',
      why1_t2: 'Ikawa',
      why1_d: 'Impeke ziva ku mirima mito y\'imiryango, zababwa mu bice bito kugira ngo haboneke ikikombe cy\'umuriro n\'uburinganire.',
      why2_t: 'Byatekwe',
      why2_t2: 'Bishya Buri Munsi',
      why2_d: 'Croissant, umugati w\'inkende n\'amakata bikorwa kuva mu ntangiriro buri gitondo — ntibigera bikibwa.',
      why3_t: 'Vuba &',
      why3_t2: 'Ashyushye',
      why3_d: 'Tumiza kuri interineti kandi ikawa n\'amakate byawe bizaba biteguye mbere yuko ugera.',
      why4_t: 'By\'ahantu &',
      why4_t2: 'Ubutabera',
      why4_d: 'Tushyigikira abahinzi b\'u Rwanda n\'abategura b\'ahantu ku buri kugura.',

      /* Experience */
      exp_quote: '"Ikawa nziza ni iyo unywa buhoro, aho wumva uriho nyabyo."',

      /* Visit */
      visit_lbl: 'Dusure',
      visit_t1: 'Amasaha &',
      visit_t2: 'Aho Duherereye',
      day_mon_fri: 'Kuwa Mbere – Kuwa Gatanu',
      day_sat: 'Kuwa Gatandatu',
      day_sun: 'Ku Cyumweru',

      /* Map */
      map_lbl: 'Dushake ku Map',
      map_t1: 'Mu Mutima wa',
      map_t2: 'Kigali',

      /* Newsletter */
      news_lbl: 'Komeza Umenye',
      news_t1: 'Injira muri',
      news_t2: 'Mood.',
      news_sub: 'Sangiza imeyili yawe n\'ikawa ukuze — tuzohereza ikaze n\'ibyifuzo by\'ikawa byawe.',
      news_name: 'Izina ryawe',
      news_email: 'imeyili@yawe.com',
      news_join: 'Injira',
      news_ok: 'Murakaza neza muri MOOD! Reba agasanduku kawe k\'imeyili vuba.',
      news_err: 'Hari ikosha ryabaye. Ongera ugerageze.',

      /* Footer */
      footer_explore: 'Shakisha',
      footer_order: 'Tumiza kuri Interineti',
      footer_connect: 'Umubano',
      footer_rights: 'Uburenganzira bwose burabitswe.',
      footer_made: 'Byakozwe n\'urukundo i Kigali ☕',

      /* Language */
      lang_label: 'Ururimi',

      /* Shop */
      shop_title: 'Tumiza kuri Interineti — MOOD Coffee Shop & Bakery',
      shop_menubtn: 'Menu',
      shop_empty: 'Nta kintu hano.',
      shop_choose_service: 'Hitamo serivisi kugira ngo urebe menu.',
      shop_add: 'Ongerera mu Gikarito',
      shop_added: 'byongewe ✓',
      shop_login_first: 'Injira mbere yo gutumiza.',
      shop_ordering_paused: 'Gutumiza kuri interineti birahagaritswe.',
      shop_cart_empty: 'Igikarito cyawe kirimo ubusa.',
      shop_remove: 'Kuraho',
      shop_total: 'Igiteranyo',
      shop_checkout: 'Komeza Kuri Checkout',
      shop_please_login: 'Injira mbere.',
      shop_payments_paused: 'Kwishyura kuri interineti birahagaritswe.',
      shop_welcome_back: 'Murakaza neza',
      shop_logged_out: 'Wasohotse.',
      shop_logout_confirm: 'Kujya usohoka muri konti yawe ya MOOD?',
      rev_login: 'Injira ngo utange igitekerezo.',
      shop_no_orders: 'Nta byo watanze umpe.',
      shop_login_to_see: 'Injira kugira ngo urebe ibyo watanze.',
      shop_enter_phone: 'Andika telefoni n\'aderesi.',
      shop_processing: 'Birimo…',
      shop_placed: 'Tumiza no Kwishyura',
      shop_confirm: 'Ibyo Watanze Byemewe!',
      shop_thanks: 'Murakoze! Ibyo watanze',
      shop_preparing: 'birimo gutegurwa.',
      shop_total_label: 'Igiteranyo:',
      shop_order_more: 'Tumiza Ikindi',
      shop_cart_title: 'Igikarito Cyawe',
      shop_paid_confirm: 'Amafaranga yageze kuri twe kandi icyo watanze kirimo gutegurwa.',
      shop_pay_cancelled: 'Kwishyura ntibyatewe — nta mafaranga yakuwe. Igikarito cyawe kirihari.',

      /* Service picker */
      svc_lbl: 'Murakaza neza kuri',
      svc_title: 'Ni iyihe serivisi',
      svc_title2: 'urimo gushaka?',
      svc_sub: 'Hitamo imwe kandi ubone byose dufite muri iyo serivisi.',
      svc_roasted: 'Byababwa Buri Munsi',
      svc_coffee_title: 'Serivisi y\'Ikawa',
      svc_coffee_desc: 'Espresso, lattes, cold brew & pour over',
      svc_browse_coffee: 'Reba Ikawa →',
      svc_baked: 'Byatekwe Bishya Buri Munsi',
      svc_bakery_title: 'Serivisi y\'Amakate',
      svc_bakery_desc: 'Amakate mashya, amakata & ibindi byatekwe',
      svc_browse_bakery: 'Reba Amakate →',
      svc_switch: 'Hindura serivisi',

      /* Checkout */
      co_title: 'Suzuza Ibyo Watanze',
      co_delivery: 'Ibyerekeye Gutanga',
      co_phone: 'Nomero ya Telefoni',
      co_addr: 'Aderesi yo Gutanga',
      co_promo: 'Kode ya Promo (by\'umwihariko)',
      co_apply: 'Koresha',
      co_notes: 'Ibyitondero by\'Ibyo Watanze',
      co_payment: 'Uburyo bwo Kwishyura',
      co_summary: 'Incamake y\'Ibyo Watanze',
      co_delivery_label: 'Gutanga',
      co_discount: 'Igabanije',
      co_free: 'Ubuntu',
      co_secure: 'Kwishyura byizewe na MTN MoMo, Airtel Money cyangwa ikarita y\'urwibanka.',
      co_gateway_note: 'Uzajyanwa ku rupapuro rw\'ishyurwa ryizewe kugira ngo urangize kwishyura.',
      co_demo_note: 'Ishyurwa ryo kwigira — nta mafaranga nyayo atangwa.',
      co_card_secure: 'Amakuru y\'ikarita yanyu arabimburwa muri mushakisha wawe mbere yo koherezwa.',
      co_momo_note: 'Ubwa mbere, igisabo cyo kwishyura cyoherezwa kuri uyu nomero. Tegura telefone yawe.',
      co_card_invalid: 'Nyamuneka wuzuze amakuru y\'ikarita neza.',
      co_card_unavailable: 'Kwishyura ikarita ntibitarangira.',
      pay_title: 'Kwishyura kurwaga',
      pay_instruction: 'Emeza kwishyura kuri telefone yawe kugira ngo urangize itegeko.',
      pay_awaiting: 'Turategereje ubwemezo bw\'ishyurwa…',
      co_promo_invalid: 'Kode ya promo mbi.',
      co_promo_ok: 'igabanije ryakoreshejwe!',

      /* Auth */
      auth_welcome: 'Murakaza Neza',
      auth_signin: 'Injira kugira ngo utumize.',
      auth_create: 'Fungura Konti',
      auth_join: 'Injira muri MOOD uyu munsi.',
      auth_name: 'Amazina Yombi',
      auth_email: 'Imeyili',
      auth_phone: 'Nomero ya Telefoni (by\'umwihariko)',
      auth_pass: 'Ijambobanga',
      auth_login_btn: 'Injira',
      auth_create_btn: 'Fungura Konti',
      auth_no_account: 'Nta konti?',
      auth_signup_free: 'Iyandikishe ku buntu',
      auth_have_account: 'Ufite konti?',
      auth_login2: 'Injira',
      auth_reg_paused: 'Iyandikisha rishya rirahagaritswe.',
      auth_welcome_toast: 'Murakaza neza,',

      /* Account */
      acc_title: 'Konti Yanjye',
      acc_profile: 'Profilo yawe kuri',
      acc_name: 'Izina',
      acc_email: 'Imeyili',
      acc_phone: 'Nomero',
      acc_member: 'Umunyamuryango kuva',
      acc_logout: 'Sohoka',

      /* Orders */
      ord_title: 'Ibyo Watanze',
      ord_processing: 'Itegurwa',
      ord_delivered: 'Byatanzwe',
      ord_pending: 'Biracyategerejwe',
      ord_cancelled: 'Byahagaritswe',
      ord_empty_title: 'Nta byo watanze',
      ord_empty_sub: 'Iyo uzatanze ikintu cya mbere, kizagaragara hano kugira ngo ukimenye igihe cyose.',
      ord_browse: 'Reba ifunguro',
      ord_login_title: 'Injira urebe ibyo watanze',
      ord_login_sub: 'Injira urebe ibyo watanze n\'amabwanisho mu mwanya umwe.'
    }
  };

  const LANGS = { en: 'English', fr: 'Français', rw: 'Kinyarwanda' };

  /* Language availability (admin can disable some languages) */
  function enabledList() {
    let list = null;
    try { list = JSON.parse(localStorage.getItem(ENABLED_KEY) || 'null'); } catch (e) { list = null; }
    if (!Array.isArray(list) || !list.length) list = Object.keys(DICT);
    return list.filter(l => DICT[l] && l !== undefined);
  }
  function saveEnabled(list) {
    try { localStorage.setItem(ENABLED_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function setAvailable(list) {
    if (!Array.isArray(list) || !list.length) return;
    const clean = list.filter(l => DICT[l]);
    if (!clean.length) return;
    saveEnabled(clean);
    if (clean.indexOf(current()) === -1) {
      localStorage.setItem(STORAGE_KEY, clean[0]);
    }
    renderSwitcher();
    apply();
  }
  function setAvailableFromToggles(t) {
    if (!t || typeof t !== 'object') return;
    const list = ['en', 'fr', 'rw'].filter(l => t['lang_' + l] !== false);
    setAvailable(list);
  }

  /* Current language */
  function current() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return DICT[saved] && enabledList().indexOf(saved) !== -1 ? saved : (enabledList()[0] || 'en');
  }

  function setLang(lang) {
    if (!DICT[lang] || enabledList().indexOf(lang) === -1) return;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    renderSwitcher();
    apply();
  }

  function t(key) {
    const lang = current();
    return (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
  }

  /* Translate all elements with data-i18n (text) and data-i18n-ph (placeholder) */
  function apply() {
    const lang = current();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = (DICT[lang] && DICT[lang][key]) || DICT.en[key];
      if (val !== undefined) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      const val = (DICT[lang] && DICT[lang][key]) || DICT.en[key];
      if (val !== undefined) el.setAttribute('placeholder', val);
    });
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang-opt') === lang);
    });
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
  }

  /* ── Language dropdown switcher ── */
  function renderSwitcher() {
    const list = enabledList();
    document.querySelectorAll('[data-lang-switch]').forEach(el => {
      el.innerHTML =
        '<div class="lang-toggle" onclick="I18N.toggleLangMenu(event)">' +
        '<span class="globe">🌐</span><span class="lang-label" data-i18n="lang_label">' + t('lang_label') + '</span><span class="caret">▾</span>' +
        '</div>' +
        '<div class="lang-menu">' +
        list.map(l => '<button type="button" class="lang-option' + (l === current() ? ' active' : '') + '" data-lang-opt="' + l + '" onclick="I18N.setLang(\'' + l + '\')">' + LANGS[l] + '</button>').join('') +
        '</div>';
    });
  }
  function toggleLangMenu(e) {
    e.stopPropagation();
    const s = e.currentTarget.closest('[data-lang-switch]');
    if (!s) return;
    const wasOpen = s.classList.contains('open');
    document.querySelectorAll('[data-lang-switch].open').forEach(o => o.classList.remove('open'));
    if (!wasOpen) {
      s.classList.add('open');
      document.body.addEventListener('click', closeLangMenus);
    }
  }
  function closeLangMenus() {
    document.querySelectorAll('[data-lang-switch].open').forEach(o => o.classList.remove('open'));
    document.body.removeEventListener('click', closeLangMenus);
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLangMenus(); });

  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = current();
    renderSwitcher();
    apply();
  });

  return {
    t, setLang, current, apply, setAvailable, setAvailableFromToggles, toggleLangMenu,
    dict: DICT, langs: LANGS
  };
})();