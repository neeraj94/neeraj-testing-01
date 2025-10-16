-- Seed core attributes
INSERT IGNORE INTO attributes (name, slug)
VALUES
    ('Color', 'color'),
    ('Size', 'size'),
    ('Material', 'material'),
    ('Connectivity', 'connectivity');

-- Seed attribute values for colors
INSERT INTO attribute_values (attribute_id, value, sort_order)
SELECT a.id, v.value, v.sort_order
FROM attributes a
JOIN (
    SELECT 'Arctic White' AS value, 1 AS sort_order UNION ALL
    SELECT 'Midnight Black', 2 UNION ALL
    SELECT 'Ocean Blue', 3 UNION ALL
    SELECT 'Sunset Orange', 4 UNION ALL
    SELECT 'Forest Green', 5 UNION ALL
    SELECT 'Graphite Gray', 6
) v ON a.slug = 'color';

-- Seed attribute values for sizes
INSERT INTO attribute_values (attribute_id, value, sort_order)
SELECT a.id, v.value, v.sort_order
FROM attributes a
JOIN (
    SELECT 'Small' AS value, 1 AS sort_order UNION ALL
    SELECT 'Medium', 2 UNION ALL
    SELECT 'Large', 3 UNION ALL
    SELECT 'Extra Large', 4
) v ON a.slug = 'size';

-- Seed attribute values for material
INSERT INTO attribute_values (attribute_id, value, sort_order)
SELECT a.id, v.value, v.sort_order
FROM attributes a
JOIN (
    SELECT 'Aluminum Frame' AS value, 1 AS sort_order UNION ALL
    SELECT 'Stainless Steel', 2 UNION ALL
    SELECT 'Silicone Blend', 3 UNION ALL
    SELECT 'Borosilicate Glass', 4
) v ON a.slug = 'material';

-- Seed attribute values for connectivity
INSERT INTO attribute_values (attribute_id, value, sort_order)
SELECT a.id, v.value, v.sort_order
FROM attributes a
JOIN (
    SELECT 'Wi-Fi' AS value, 1 AS sort_order UNION ALL
    SELECT 'Bluetooth', 2 UNION ALL
    SELECT 'Zigbee', 3 UNION ALL
    SELECT 'Thread', 4
) v ON a.slug = 'connectivity';

-- Seed primary catalog categories
INSERT IGNORE INTO categories (name, slug, type, order_number, meta_title, meta_description)
VALUES
    ('Smart Home Essentials', 'smart-home', 'PHYSICAL', 1, 'Smart Home Essentials', 'Connected devices to automate every room.'),
    ('Premium Audio', 'premium-audio', 'PHYSICAL', 2, 'Premium Audio', 'High fidelity sound systems and accessories.'),
    ('Smart Wearables', 'smart-wearables', 'PHYSICAL', 3, 'Smart Wearables', 'Trackers and wearables for active lifestyles.'),
    ('Connected Kitchen', 'connected-kitchen', 'PHYSICAL', 4, 'Connected Kitchen', 'Smarter appliances for everyday cooking.'),
    ('Connected Fitness', 'connected-fitness', 'PHYSICAL', 5, 'Connected Fitness', 'Tech-enabled gear to reach wellness goals.'),
    ('Ambient Lighting', 'ambient-lighting', 'PHYSICAL', 6, 'Ambient Lighting', 'Lighting to transform living spaces.'),
    ('Home Security', 'home-security', 'PHYSICAL', 7, 'Home Security', 'Peace-of-mind devices for every entry point.'),
    ('Creative Computing', 'creative-computing', 'PHYSICAL', 8, 'Creative Computing', 'Peripherals that boost productivity and play.'),
    ('Outdoor Living', 'outdoor-living', 'PHYSICAL', 9, 'Outdoor Living', 'Gear built for adventure and travel.'),
    ('Wellness Lifestyle', 'wellness-lifestyle', 'PHYSICAL', 10, 'Wellness Lifestyle', 'Create restorative routines at home.');
-- Seed showcase products
INSERT IGNORE INTO products (
    name, slug, unit, weight_kg, min_purchase_quantity, featured, todays_deal, short_description, description,
    unit_price, discount_type, discount_value, discount_min_qty, discount_max_qty, stock_quantity,
    sku, stock_visibility, low_stock_warning
)
VALUES
    ('Aurora Smart Speaker', 'aurora-smart-speaker', 'piece', 0.900, 1, 1, 0, 'Immersive 360 degree sound with voice automations.', 'Hands-free speaker with adaptive audio tuning and multi-room sync.', 199.00, 'PERCENTAGE', 10.00, 1, NULL, 250, 'SKU-PRD-0001', 'SHOW_QUANTITY', 20),
    ('Aurora Mini Speaker', 'aurora-mini-speaker', 'piece', 0.420, 1, 0, 0, 'Pocket sized smart speaker for bedside listening.', 'Compact assistant ready speaker with four far-field microphones.', 129.00, NULL, NULL, NULL, NULL, 320, 'SKU-PRD-0002', 'SHOW_QUANTITY', 25),
    ('Lumos Ambient Lamp', 'lumos-ambient-lamp', 'piece', 1.100, 1, 1, 1, 'Create calm with adaptive sunrise and sunset lighting.', 'Adjustable table lamp with tunable white and wellness routines.', 149.00, 'PERCENTAGE', 12.00, 1, NULL, 180, 'SKU-PRD-0003', 'SHOW_QUANTITY', 18),
    ('Lumos Color Strip', 'lumos-color-strip', 'kit', 0.650, 1, 0, 1, 'Flexible color strip with scenes and gradients.', 'Six meter flexible strip with million color scenes and rhythm sync.', 89.00, NULL, NULL, NULL, NULL, 400, 'SKU-PRD-0004', 'SHOW_QUANTITY', 30),
    ('Pulse Fitness Tracker', 'pulse-fitness-tracker', 'piece', 0.080, 1, 1, 0, 'Daily readiness tracker with week long battery.', 'Advanced biometrics for heart rate, sleep, and activity insights.', 179.00, 'PERCENTAGE', 15.00, 1, NULL, 290, 'SKU-PRD-0005', 'SHOW_QUANTITY', 15),
    ('Pulse Fitness Tracker Pro', 'pulse-fitness-tracker-pro', 'piece', 0.085, 1, 1, 1, 'Pro grade training metrics with onboard GPS.', 'Multisport tracking, training load analytics, and offline maps.', 249.00, 'PERCENTAGE', 18.00, 1, NULL, 210, 'SKU-PRD-0006', 'SHOW_QUANTITY', 15),
    ('Tempo Wireless Earbuds', 'tempo-wireless-earbuds', 'pair', 0.060, 1, 0, 0, 'Secure fit earbuds with spatial audio.', 'Adaptive EQ earbuds with multipoint pairing and workout mode.', 159.00, NULL, NULL, NULL, NULL, 360, 'SKU-PRD-0007', 'SHOW_QUANTITY', 25),
    ('Tempo Noise Canceling Headphones', 'tempo-noise-canceling-headphones', 'piece', 0.310, 1, 1, 0, 'Flagship ANC headphones with studio tuning.', 'Over-ear headphones with 40 hours playback and fast charge.', 329.00, 'PERCENTAGE', 20.00, 1, NULL, 140, 'SKU-PRD-0008', 'SHOW_QUANTITY', 12),
    ('Aether Air Purifier', 'aether-air-purifier', 'piece', 4.800, 1, 1, 0, 'Quiet HEPA filtration for open concept homes.', 'Triple layer filtration with air quality dashboard and automation.', 349.00, NULL, NULL, NULL, NULL, 90, 'SKU-PRD-0009', 'SHOW_QUANTITY', 10),
    ('Aether Compact Purifier', 'aether-compact-purifier', 'piece', 2.400, 1, 0, 0, 'Bedroom sized purifier with app automations.', 'Small footprint purifier with night mode and replaceable filters.', 199.00, NULL, NULL, NULL, NULL, 160, 'SKU-PRD-0010', 'SHOW_QUANTITY', 16),
    ('Savor Smart Blender', 'savor-smart-blender', 'piece', 3.900, 1, 1, 0, 'Touch programmed blender with recipe guidance.', 'High torque blender with auto clean cycle and guided recipes.', 229.00, 'PERCENTAGE', 10.00, 1, NULL, 130, 'SKU-PRD-0011', 'SHOW_QUANTITY', 12),
    ('Savor Precision Kettle', 'savor-precision-kettle', 'piece', 1.500, 1, 0, 0, 'Pour over perfection with degree specific heating.', 'Variable temperature kettle with brew curves and keep warm modes.', 139.00, NULL, NULL, NULL, NULL, 220, 'SKU-PRD-0012', 'SHOW_QUANTITY', 18),
    ('Hearth Sous Vide Stick', 'hearth-sous-vide-stick', 'piece', 1.200, 1, 0, 0, 'Precision cooking stick with guided recipes.', 'Wifi connected sous vide circulator for effortless gourmet meals.', 169.00, NULL, NULL, NULL, NULL, 150, 'SKU-PRD-0013', 'SHOW_QUANTITY', 14),
    ('Hearth Smart Oven', 'hearth-smart-oven', 'piece', 8.400, 1, 1, 1, 'Countertop oven that steams, bakes, and air fries.', 'Eight mode smart oven with camera monitoring and presets.', 499.00, 'PERCENTAGE', 15.00, 1, NULL, 80, 'SKU-PRD-0014', 'SHOW_QUANTITY', 8),
    ('Flux Portable Charger', 'flux-portable-charger', 'piece', 0.260, 1, 0, 0, 'Magnetic 10K power bank with fast charge.', 'Pocket ready charger with integrated stand and pass-through charging.', 89.00, NULL, NULL, NULL, NULL, 500, 'SKU-PRD-0015', 'SHOW_QUANTITY', 35),
    ('Flux Solar Power Bank', 'flux-solar-power-bank', 'piece', 0.540, 1, 0, 0, 'Solar assisted bank built for road trips.', 'Dustproof, water resistant power bank with twin solar panels.', 129.00, NULL, NULL, NULL, NULL, 260, 'SKU-PRD-0016', 'SHOW_QUANTITY', 24),
    ('Guardian Door Camera', 'guardian-door-camera', 'piece', 0.800, 1, 1, 1, '4K HDR doorbell with radar motion detection.', 'Dual band doorbell with package detection and visitor logs.', 249.00, 'PERCENTAGE', 12.00, 1, NULL, 140, 'SKU-PRD-0017', 'SHOW_QUANTITY', 10),
    ('Guardian Indoor Camera', 'guardian-indoor-camera', 'piece', 0.420, 1, 0, 0, 'Privacy shutter equipped indoor camera.', '1080p camera with person detection and privacy scheduling.', 129.00, NULL, NULL, NULL, NULL, 260, 'SKU-PRD-0018', 'SHOW_QUANTITY', 18),
    ('Horizon 4K Monitor', 'horizon-4k-monitor', 'piece', 5.600, 1, 1, 0, 'Color accurate 32 inch 4K USB-C monitor.', '98 percent DCI-P3 coverage with single cable laptop charging.', 599.00, 'PERCENTAGE', 10.00, 1, NULL, 110, 'SKU-PRD-0019', 'SHOW_QUANTITY', 9),
    ('Horizon Portable Monitor', 'horizon-portable-monitor', 'piece', 1.200, 1, 0, 0, 'Travel ready 15 inch second screen.', 'Slim portable monitor with kickstand cover and touch support.', 279.00, NULL, NULL, NULL, NULL, 200, 'SKU-PRD-0020', 'SHOW_QUANTITY', 16),
    ('Summit Hiking Backpack', 'summit-hiking-backpack', 'piece', 1.800, 1, 0, 0, '30L technical pack with hydration routing.', 'Weather resistant pack with ventilated back panel and gear loops.', 189.00, NULL, NULL, NULL, NULL, 150, 'SKU-PRD-0021', 'SHOW_QUANTITY', 12),
    ('Summit Insulated Bottle', 'summit-insulated-bottle', 'piece', 0.420, 1, 0, 0, 'Keeps drinks hot 18 hours and cold 36.', 'Triple layer bottle with sip lid and carry loop for adventures.', 49.00, NULL, NULL, NULL, NULL, 380, 'SKU-PRD-0022', 'SHOW_QUANTITY', 30),
    ('Glide Electric Scooter', 'glide-electric-scooter', 'piece', 12.500, 1, 1, 1, 'Long range scooter with regenerative braking.', '350W scooter delivering 45 km range with app diagnostics.', 799.00, 'PERCENTAGE', 12.00, 1, NULL, 70, 'SKU-PRD-0023', 'SHOW_QUANTITY', 6),
    ('Glide Helmet', 'glide-helmet', 'piece', 0.580, 1, 0, 0, 'Safety helmet with smart lighting.', 'Impact rated helmet with automatic brake light and fall alerts.', 119.00, NULL, NULL, NULL, NULL, 210, 'SKU-PRD-0024', 'SHOW_QUANTITY', 14),
    ('Orbit Smart Thermostat', 'orbit-smart-thermostat', 'piece', 0.520, 1, 1, 0, 'Energy saving thermostat with room mapping.', 'Adaptive thermostat with occupancy detection and energy reports.', 229.00, 'PERCENTAGE', 12.00, 1, NULL, 160, 'SKU-PRD-0025', 'SHOW_QUANTITY', 12),
    ('Orbit Temperature Sensor', 'orbit-temperature-sensor', 'piece', 0.090, 1, 0, 0, 'Satellite sensor for zoned comfort.', 'Battery powered sensor balancing temperatures room to room.', 49.00, NULL, NULL, NULL, NULL, 420, 'SKU-PRD-0026', 'SHOW_QUANTITY', 25),
    ('Nimbus Smart Fan', 'nimbus-smart-fan', 'piece', 5.200, 1, 0, 0, 'App controlled fan with seasonal modes.', 'Whisper quiet fan with adaptive airflow and air quality data.', 199.00, NULL, NULL, NULL, NULL, 140, 'SKU-PRD-0027', 'SHOW_QUANTITY', 11),
    ('Nimbus Air Circulator', 'nimbus-air-circulator', 'piece', 3.900, 1, 0, 0, 'Whole room circulation with auto pivots.', 'Three dimensional air circulation with smart schedules.', 159.00, NULL, NULL, NULL, NULL, 200, 'SKU-PRD-0028', 'SHOW_QUANTITY', 14),
    ('Spark Robot Vacuum', 'spark-robot-vacuum', 'piece', 4.000, 1, 1, 1, 'Lidar navigation robot vacuum with mop dock.', 'Laser mapping, room specific routines, and self empty station.', 649.00, 'PERCENTAGE', 15.00, 1, NULL, 85, 'SKU-PRD-0029', 'SHOW_QUANTITY', 8),
    ('Spark Mop Companion', 'spark-mop-companion', 'piece', 2.800, 1, 0, 0, 'Dual spinning mop with smart water control.', 'High torque floor washer that syncs to Spark robot routes.', 299.00, NULL, NULL, NULL, NULL, 130, 'SKU-PRD-0030', 'SHOW_QUANTITY', 10),
    ('EchoSmart Baby Monitor', 'echosmart-baby-monitor', 'piece', 0.480, 1, 0, 0, 'Crib safe monitor with cry detection alerts.', 'Secure baby monitor with breathing graph and lullaby projector.', 229.00, NULL, NULL, NULL, NULL, 150, 'SKU-PRD-0031', 'SHOW_QUANTITY', 12),
    ('EchoSmart Sleep Sensor', 'echosmart-sleep-sensor', 'piece', 0.220, 1, 0, 0, 'Under mattress sleep tracking mat.', 'Non contact sensor delivering nightly sleep quality breakdown.', 179.00, NULL, NULL, NULL, NULL, 190, 'SKU-PRD-0032', 'SHOW_QUANTITY', 12),
    ('Atlas Gaming Mouse', 'atlas-gaming-mouse', 'piece', 0.110, 1, 0, 0, '65g lightweight mouse with 26K sensor.', 'Customizable gaming mouse with rapid switches and RGB zones.', 129.00, NULL, NULL, NULL, NULL, 280, 'SKU-PRD-0033', 'SHOW_QUANTITY', 20),
    ('Atlas Mechanical Keyboard', 'atlas-mechanical-keyboard', 'piece', 1.150, 1, 0, 0, 'Hot swap mechanical keyboard with gasket mount.', 'South facing RGB keyboard with tri-mode connectivity.', 189.00, NULL, NULL, NULL, NULL, 220, 'SKU-PRD-0034', 'SHOW_QUANTITY', 18),
    ('Prism LED Light Panels', 'prism-led-light-panels', 'set', 1.400, 1, 1, 0, 'Modular wall panels with scenes and rhythm sync.', 'Interlocking light panels creating murals with music sync.', 299.00, 'PERCENTAGE', 15.00, 1, NULL, 110, 'SKU-PRD-0035', 'SHOW_QUANTITY', 9),
    ('Prism Desk Lamp', 'prism-desk-lamp', 'piece', 0.920, 1, 0, 0, 'Task lighting with color focus modes.', 'Desk lamp offering focus, create, and relax light recipes.', 159.00, NULL, NULL, NULL, NULL, 200, 'SKU-PRD-0036', 'SHOW_QUANTITY', 16),
    ('Clarity Noise Machine', 'clarity-noise-machine', 'piece', 0.350, 1, 0, 0, 'Soundscapes for deep focus and sleep.', 'Portable noise machine with adaptive masking and timer modes.', 99.00, NULL, NULL, NULL, NULL, 260, 'SKU-PRD-0037', 'SHOW_QUANTITY', 20),
    ('Clarity Sleep Mask', 'clarity-sleep-mask', 'piece', 0.140, 1, 0, 0, 'Light blocking mask with cooling gel.', 'Memory foam mask with replaceable cooling inserts.', 59.00, NULL, NULL, NULL, NULL, 320, 'SKU-PRD-0038', 'SHOW_QUANTITY', 25),
    ('Thrive Yoga Mat', 'thrive-yoga-mat', 'piece', 1.800, 1, 0, 0, 'Non slip mat with posture alignment guide.', 'Performance mat with dual grip texture and printed guides.', 89.00, NULL, NULL, NULL, NULL, 210, 'SKU-PRD-0039', 'SHOW_QUANTITY', 14),
    ('Thrive Foam Roller', 'thrive-foam-roller', 'piece', 0.950, 1, 0, 0, 'Textured roller for deep tissue recovery.', 'High density foam roller with trigger point zones.', 49.00, NULL, NULL, NULL, NULL, 260, 'SKU-PRD-0040', 'SHOW_QUANTITY', 18),
    ('Breeze Air Humidifier', 'breeze-air-humidifier', 'piece', 2.300, 1, 0, 0, 'Ultrasonic humidifier with aromatherapy well.', 'Top fill humidifier with night glow and humidity targets.', 159.00, NULL, NULL, NULL, NULL, 170, 'SKU-PRD-0041', 'SHOW_QUANTITY', 14),
    ('Breeze Mini Humidifier', 'breeze-mini-humidifier', 'piece', 0.620, 1, 0, 0, 'Travel humidifier with USB-C power.', 'Compact humidifier for desks, with auto shutoff and glow mode.', 69.00, NULL, NULL, NULL, NULL, 280, 'SKU-PRD-0042', 'SHOW_QUANTITY', 20),
    ('Core Smart Scale', 'core-smart-scale', 'piece', 1.700, 1, 0, 0, 'Segmental body composition with Wi-Fi sync.', 'Measures 14 metrics with athlete mode and trend insights.', 149.00, 'PERCENTAGE', 10.00, 1, NULL, 190, 'SKU-PRD-0043', 'SHOW_QUANTITY', 12),
    ('Core Body Analyzer', 'core-body-analyzer', 'piece', 1.850, 1, 0, 0, 'Professional grade analyzer for studios.', 'Multi user analyzer with kiosk mode and client profiles.', 329.00, NULL, NULL, NULL, NULL, 90, 'SKU-PRD-0044', 'SHOW_QUANTITY', 8),
    ('Ember Smart Mug', 'ember-smart-mug', 'piece', 0.420, 1, 0, 0, 'Temperature controlled mug with presets.', 'Keeps beverages at the perfect sip temperature for hours.', 179.00, NULL, NULL, NULL, NULL, 210, 'SKU-PRD-0045', 'SHOW_QUANTITY', 15),
    ('Ember Travel Mug', 'ember-travel-mug', 'piece', 0.560, 1, 0, 0, '12 oz travel mug with precise heat control.', 'Leak proof travel mug with auto sleep and fast charge coaster.', 199.00, NULL, NULL, NULL, NULL, 160, 'SKU-PRD-0046', 'SHOW_QUANTITY', 14),
    ('Haven Smart Plug', 'haven-smart-plug', 'piece', 0.130, 1, 0, 0, 'Energy monitoring plug with scheduler.', 'Control lamps and appliances with scenes and automations.', 39.00, NULL, NULL, NULL, NULL, 520, 'SKU-PRD-0047', 'SHOW_QUANTITY', 40),
    ('Haven Power Strip', 'haven-power-strip', 'piece', 0.780, 1, 0, 0, 'Surge protected strip with four smart outlets.', 'Individually controllable outlets with USB-C fast charging.', 79.00, NULL, NULL, NULL, NULL, 260, 'SKU-PRD-0048', 'SHOW_QUANTITY', 30),
    ('Pulse Athletic Earbuds', 'pulse-athletic-earbuds', 'pair', 0.065, 1, 1, 0, 'Sweatproof earbuds tuned for training.', 'Secure fit earbuds with wing tips and coaching prompts.', 169.00, 'PERCENTAGE', 10.00, 1, NULL, 240, 'SKU-PRD-0049', 'SHOW_QUANTITY', 18),
    ('Pulse Swim Tracker', 'pulse-swim-tracker', 'piece', 0.070, 1, 0, 0, 'Waterproof tracker for lap insights.', 'Swim ready wearable logging splits, strokes, and SWOLF.', 149.00, NULL, NULL, NULL, NULL, 200, 'SKU-PRD-0050', 'SHOW_QUANTITY', 16);
-- Map products to categories
INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'premium-audio'
WHERE p.slug IN ('aurora-smart-speaker', 'aurora-mini-speaker', 'tempo-wireless-earbuds', 'tempo-noise-canceling-headphones', 'pulse-athletic-earbuds');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'ambient-lighting'
WHERE p.slug IN ('lumos-ambient-lamp', 'lumos-color-strip', 'prism-led-light-panels', 'prism-desk-lamp');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'smart-wearables'
WHERE p.slug IN ('pulse-fitness-tracker', 'pulse-fitness-tracker-pro', 'pulse-athletic-earbuds', 'pulse-swim-tracker');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'connected-fitness'
WHERE p.slug IN ('thrive-yoga-mat', 'thrive-foam-roller', 'core-smart-scale', 'core-body-analyzer');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'connected-kitchen'
WHERE p.slug IN ('savor-smart-blender', 'savor-precision-kettle', 'hearth-sous-vide-stick', 'hearth-smart-oven', 'ember-smart-mug', 'ember-travel-mug');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'home-security'
WHERE p.slug IN ('guardian-door-camera', 'guardian-indoor-camera', 'echosmart-baby-monitor');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'creative-computing'
WHERE p.slug IN ('flux-portable-charger', 'horizon-4k-monitor', 'horizon-portable-monitor', 'atlas-gaming-mouse', 'atlas-mechanical-keyboard');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'outdoor-living'
WHERE p.slug IN ('flux-solar-power-bank', 'summit-hiking-backpack', 'summit-insulated-bottle', 'glide-electric-scooter', 'glide-helmet');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'smart-home'
WHERE p.slug IN ('orbit-smart-thermostat', 'orbit-temperature-sensor', 'nimbus-smart-fan', 'nimbus-air-circulator', 'spark-robot-vacuum', 'spark-mop-companion', 'haven-smart-plug', 'haven-power-strip');

INSERT IGNORE INTO product_categories (product_id, category_id)
SELECT p.id, c.id
FROM products p
JOIN categories c ON c.slug = 'wellness-lifestyle'
WHERE p.slug IN ('aether-air-purifier', 'aether-compact-purifier', 'echosmart-sleep-sensor', 'clarity-noise-machine', 'clarity-sleep-mask', 'breeze-air-humidifier', 'breeze-mini-humidifier');
-- Assign color attributes
INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Arctic White' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'color')
WHERE p.slug IN ('aurora-smart-speaker', 'lumos-ambient-lamp', 'aether-air-purifier', 'savor-smart-blender', 'guardian-door-camera', 'orbit-smart-thermostat', 'spark-robot-vacuum', 'prism-led-light-panels');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Midnight Black' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'color')
WHERE p.slug IN ('aurora-mini-speaker', 'lumos-color-strip', 'tempo-noise-canceling-headphones', 'guardian-indoor-camera', 'spark-mop-companion', 'atlas-mechanical-keyboard', 'haven-power-strip', 'core-body-analyzer');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Ocean Blue' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'color')
WHERE p.slug IN ('tempo-wireless-earbuds', 'pulse-fitness-tracker', 'aether-compact-purifier', 'savor-precision-kettle', 'horizon-portable-monitor', 'summit-insulated-bottle', 'glide-electric-scooter', 'breeze-air-humidifier');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Sunset Orange' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'color')
WHERE p.slug IN ('pulse-fitness-tracker-pro', 'flux-portable-charger', 'summit-hiking-backpack', 'glide-helmet', 'thrive-yoga-mat');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Forest Green' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'color')
WHERE p.slug IN ('flux-solar-power-bank', 'nimbus-smart-fan', 'nimbus-air-circulator', 'thrive-foam-roller', 'breeze-mini-humidifier');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Graphite Gray' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'color')
WHERE p.slug IN ('horizon-4k-monitor', 'atlas-gaming-mouse', 'prism-desk-lamp', 'clarity-noise-machine', 'haven-smart-plug', 'ember-smart-mug');

-- Assign size options
INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.attribute_id = (SELECT id FROM attributes WHERE slug = 'size') AND v.value IN ('Small', 'Medium', 'Large')
WHERE p.slug IN ('pulse-fitness-tracker', 'pulse-fitness-tracker-pro', 'pulse-athletic-earbuds', 'pulse-swim-tracker');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.attribute_id = (SELECT id FROM attributes WHERE slug = 'size') AND v.value IN ('Large', 'Extra Large')
WHERE p.slug IN ('thrive-yoga-mat', 'thrive-foam-roller');

-- Assign material attributes
INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Stainless Steel' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'material')
WHERE p.slug IN ('savor-smart-blender', 'savor-precision-kettle', 'hearth-sous-vide-stick', 'hearth-smart-oven', 'ember-smart-mug', 'ember-travel-mug');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Aluminum Frame' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'material')
WHERE p.slug IN ('glide-electric-scooter', 'horizon-4k-monitor', 'horizon-portable-monitor', 'atlas-gaming-mouse', 'atlas-mechanical-keyboard');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Silicone Blend' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'material')
WHERE p.slug IN ('pulse-fitness-tracker', 'pulse-fitness-tracker-pro', 'pulse-athletic-earbuds', 'pulse-swim-tracker');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Borosilicate Glass' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'material')
WHERE p.slug IN ('summit-insulated-bottle', 'savor-precision-kettle');

-- Assign connectivity attributes
INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Wi-Fi' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'connectivity')
WHERE p.slug IN ('aurora-smart-speaker', 'guardian-door-camera', 'guardian-indoor-camera', 'orbit-smart-thermostat', 'spark-robot-vacuum', 'echosmart-baby-monitor', 'core-smart-scale', 'haven-smart-plug');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Bluetooth' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'connectivity')
WHERE p.slug IN ('aurora-mini-speaker', 'tempo-wireless-earbuds', 'tempo-noise-canceling-headphones', 'pulse-fitness-tracker', 'pulse-fitness-tracker-pro', 'pulse-athletic-earbuds', 'pulse-swim-tracker');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Zigbee' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'connectivity')
WHERE p.slug IN ('orbit-smart-thermostat', 'orbit-temperature-sensor', 'haven-smart-plug', 'haven-power-strip');

INSERT IGNORE INTO product_attribute_values (product_id, attribute_value_id)
SELECT p.id, v.id
FROM products p
JOIN attribute_values v ON v.value = 'Thread' AND v.attribute_id = (SELECT id FROM attributes WHERE slug = 'connectivity')
WHERE p.slug IN ('nimbus-smart-fan', 'nimbus-air-circulator', 'spark-robot-vacuum', 'spark-mop-companion');
-- Seed promotional coupons
INSERT IGNORE INTO coupons (type, name, code, short_description, long_description, discount_type, discount_value, minimum_cart_value, start_date, end_date, status, image_url, apply_to_all_new_users)
VALUES
    ('PRODUCT', 'Smart Home Savings 10', 'SMART10', 'Save 10% on connected home upgrades.', 'Enjoy a season of comfort with 10% off select smart home essentials.', 'PERCENTAGE', 10.00, NULL, '2025-01-01 00:00:00', '2025-12-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/smart-home-savings.png', 0),
    ('PRODUCT', 'Premium Audio 15', 'AUDIO15', '15% off immersive sound gear.', 'Turn up the volume with 15% savings on featured headphones and speakers.', 'PERCENTAGE', 15.00, NULL, '2025-01-01 00:00:00', '2025-08-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/audio-festival.png', 0),
    ('PRODUCT', 'Wearables Launch 20', 'WEAR20', 'Launch special for flagship wearables.', 'Celebrate the new Pulse wearables collection with 20% off featured trackers.', 'PERCENTAGE', 20.00, NULL, '2025-02-01 00:00:00', '2025-06-30 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/wearable-launch.png', 0),
    ('PRODUCT', 'Kitchen Bundle Bonus', 'KITCHEN12', 'Bundle and save on smart kitchen picks.', 'Stack recipes like a pro with 12% off premium smart kitchen tools.', 'PERCENTAGE', 12.00, NULL, '2025-03-01 00:00:00', '2025-11-30 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/kitchen-bundle.png', 0),
    ('PRODUCT', 'Fitness Focus Event', 'FITNESS18', 'Crush goals with 18% off connected fitness.', 'Track progress faster with 18% savings on smart scales and recovery gear.', 'PERCENTAGE', 18.00, NULL, '2025-01-15 00:00:00', '2025-09-30 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/fitness-focus.png', 0),
    ('PRODUCT', 'Outdoor Explorer Deal', 'OUTDOOR12', 'Adventure essentials take 12% off.', 'Pack light and roam far with 12% off outdoor tech favorites.', 'PERCENTAGE', 12.00, NULL, '2025-04-01 00:00:00', '2025-10-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/outdoor-explorer.png', 0),
    ('PRODUCT', 'Wellness Daily Treat', 'WELLNESS8', 'Unwind with 8% off wellness comforts.', 'Create calming rituals with 8% savings on purifiers, humidifiers, and more.', 'PERCENTAGE', 8.00, NULL, '2025-01-01 00:00:00', '2025-12-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/wellness-daily.png', 0),
    ('PRODUCT', 'Lighting Glow Festival', 'LIGHT15', 'Bright ideas earn 15% off.', 'Refresh every space with 15% off ambient lighting centerpieces.', 'PERCENTAGE', 15.00, NULL, '2025-05-01 00:00:00', '2025-09-01 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/lighting-glow.png', 0),
    ('PRODUCT', 'Workspace Boost 20', 'BOOST20', 'Upgrade desks with 20% savings.', 'Optimize creative workstations with 20% off chargers and peripherals.', 'PERCENTAGE', 20.00, NULL, '2025-02-15 00:00:00', '2025-07-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/workspace-boost.png', 0),
    ('CART_VALUE', 'Cart Saver 50', 'SAVE50', 'Take $50 off carts above $400.', 'Unlock $50 savings automatically on carts worth $400 or more.', 'FLAT', 50.00, 400.00, '2025-01-01 00:00:00', '2025-12-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/save-50.png', 0),
    ('CART_VALUE', 'Cart Saver 75', 'SAVE75', 'Save $75 when you stock up.', 'Spend $600 and save $75 on top of current deals.', 'FLAT', 75.00, 600.00, '2025-03-01 00:00:00', '2025-12-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/save-75.png', 0),
    ('CART_VALUE', 'Cart Percent 10', 'CART10', 'Sitewide 10% off above $250.', 'Enjoy 10% off when your cart crosses $250 before tax and shipping.', 'PERCENTAGE', 10.00, 250.00, '2025-01-01 00:00:00', '2025-05-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/cart-10.png', 0),
    ('NEW_SIGNUP', 'Welcome Aboard 25', 'WELCOME25', 'New members earn 25% off first order.', 'Create an account and receive a 25% welcome boost on your first purchase.', 'PERCENTAGE', 25.00, NULL, '2025-01-01 00:00:00', '2025-12-31 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/welcome-25.png', 1),
    ('NEW_SIGNUP', 'Fresh Start Bonus', 'FRESH15', 'Fresh accounts unlock $15 off.', 'Kick off your connected living journey with a $15 credit on first checkout.', 'FLAT', 15.00, NULL, '2025-01-01 00:00:00', '2025-09-30 23:59:59', 'ENABLED', 'https://cdn.demo-store.com/coupons/fresh-start.png', 1);

-- Link coupons to categories
INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'smart-home'
WHERE c.code = 'SMART10';

INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'premium-audio'
WHERE c.code = 'AUDIO15';

INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'connected-kitchen'
WHERE c.code = 'KITCHEN12';

INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'connected-fitness'
WHERE c.code = 'FITNESS18';

INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'outdoor-living'
WHERE c.code = 'OUTDOOR12';

INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'wellness-lifestyle'
WHERE c.code = 'WELLNESS8';

INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'ambient-lighting'
WHERE c.code = 'LIGHT15';

INSERT IGNORE INTO coupon_categories (coupon_id, category_id)
SELECT c.id, cat.id
FROM coupons c
JOIN categories cat ON cat.slug = 'creative-computing'
WHERE c.code = 'BOOST20';

-- Link product specific coupons
INSERT IGNORE INTO coupon_products (coupon_id, product_id)
SELECT c.id, p.id
FROM coupons c
JOIN products p ON p.slug IN ('pulse-fitness-tracker', 'pulse-fitness-tracker-pro', 'pulse-athletic-earbuds', 'pulse-swim-tracker')
WHERE c.code = 'WEAR20';

INSERT IGNORE INTO coupon_products (coupon_id, product_id)
SELECT c.id, p.id
FROM coupons c
JOIN products p ON p.slug IN ('flux-portable-charger', 'horizon-4k-monitor', 'atlas-mechanical-keyboard')
WHERE c.code = 'BOOST20';
