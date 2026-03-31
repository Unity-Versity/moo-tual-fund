-- Merge Blade Roast + Beef Cheeks into "Blade & Cheeks"
DELETE FROM cuts WHERE name IN ('Blade Roast', 'Beef Cheeks');

INSERT INTO cuts (name, category, est_weight_per_slot_kg, is_processable, display_order, portions_per_slot)
VALUES ('Blade & Cheeks', 'slow_cook', 3.5, true, 7, 1)
ON CONFLICT (name) DO NOTHING;

-- Make processable: Brisket, Beef Ribs, Chuck Roast, Silverside, Top Round, Shins
UPDATE cuts SET is_processable = true WHERE name IN ('Brisket', 'Beef Ribs', 'Chuck Roast', 'Silverside');

-- Rename Topside → Top Round, Osso Bucco → Shins, make processable
UPDATE cuts SET name = 'Top Round', is_processable = true WHERE name = 'Topside';
UPDATE cuts SET name = 'Shins', is_processable = true WHERE name = 'Osso Bucco';

-- Brisket prep options
INSERT INTO prep_options (cut_id, label, extra_cost, display_order)
SELECT c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
FROM cuts c
CROSS JOIN (VALUES
  ('Raw', 0, 1),
  ('Smoked & Sliced', 3, 2)
) AS opt(label, extra_cost, display_order)
WHERE c.name = 'Brisket'
ON CONFLICT (cut_id, label) DO NOTHING;

-- Beef Ribs prep options
INSERT INTO prep_options (cut_id, label, extra_cost, display_order)
SELECT c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
FROM cuts c
CROSS JOIN (VALUES
  ('Raw', 0, 1),
  ('Slow Cooked (fall off bone)', 3, 2)
) AS opt(label, extra_cost, display_order)
WHERE c.name = 'Beef Ribs'
ON CONFLICT (cut_id, label) DO NOTHING;

-- Chuck Roast prep options
INSERT INTO prep_options (cut_id, label, extra_cost, display_order)
SELECT c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
FROM cuts c
CROSS JOIN (VALUES
  ('Raw', 0, 1),
  ('BBQ Pulled Beef', 3, 2)
) AS opt(label, extra_cost, display_order)
WHERE c.name = 'Chuck Roast'
ON CONFLICT (cut_id, label) DO NOTHING;

-- Blade & Cheeks prep options
INSERT INTO prep_options (cut_id, label, extra_cost, display_order)
SELECT c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
FROM cuts c
CROSS JOIN (VALUES
  ('Raw', 0, 1),
  ('Chinese Braised', 3, 2)
) AS opt(label, extra_cost, display_order)
WHERE c.name = 'Blade & Cheeks'
ON CONFLICT (cut_id, label) DO NOTHING;

-- Silverside prep options
INSERT INTO prep_options (cut_id, label, extra_cost, display_order)
SELECT c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
FROM cuts c
CROSS JOIN (VALUES
  ('Raw', 0, 1),
  ('Red Wine & Onion Braised', 3, 2)
) AS opt(label, extra_cost, display_order)
WHERE c.name = 'Silverside'
ON CONFLICT (cut_id, label) DO NOTHING;

-- Top Round prep options
INSERT INTO prep_options (cut_id, label, extra_cost, display_order)
SELECT c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
FROM cuts c
CROSS JOIN (VALUES
  ('Raw', 0, 1),
  ('Roast Beef', 3, 2)
) AS opt(label, extra_cost, display_order)
WHERE c.name = 'Top Round'
ON CONFLICT (cut_id, label) DO NOTHING;

-- Shins prep options
INSERT INTO prep_options (cut_id, label, extra_cost, display_order)
SELECT c.id, opt.label, opt.extra_cost::numeric, opt.display_order::int
FROM cuts c
CROSS JOIN (VALUES
  ('Raw', 0, 1),
  ('Shredded Beef', 3, 2)
) AS opt(label, extra_cost, display_order)
WHERE c.name = 'Shins'
ON CONFLICT (cut_id, label) DO NOTHING;
