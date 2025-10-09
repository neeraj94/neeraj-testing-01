-- Align email settings to SMTP-only configuration
UPDATE settings
SET category_description = 'Manage SMTP credentials and email templates.'
WHERE category_key = 'email';

UPDATE settings
SET section_description = 'Configure how outbound email is delivered to your contacts via SMTP.'
WHERE category_key = 'email'
  AND section_key = 'email-smtp';

UPDATE settings
SET value = 'smtp',
    options_json = '[{"value":"smtp","label":"SMTP"}]',
    description = 'Delivery engine used when sending emails. This deployment uses SMTP only.',
    editable = FALSE
WHERE code = 'email.driver';

DELETE FROM settings
WHERE code = 'email.sendmail_path';

-- Normalize any legacy driver selections
UPDATE settings
SET value = 'smtp'
WHERE code = 'email.driver'
  AND (value IS NULL
       OR LOWER(TRIM(value)) NOT IN ('smtp'));
