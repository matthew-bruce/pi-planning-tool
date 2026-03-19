-- Add display_order to arts table for custom ART ordering in planning header and admin
ALTER TABLE arts ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
UPDATE arts SET display_order = 1 WHERE name = 'Web & App';
UPDATE arts SET display_order = 2 WHERE name = 'Out Of Home';
UPDATE arts SET display_order = 3 WHERE name = 'Customer Relationship Management';
