-- Reorganize legacy email settings into a dedicated category and extend SMTP options
UPDATE settings
SET category_order = 3
WHERE category_key = 'finance';

UPDATE settings
SET category_order = 4
WHERE category_key = 'integrations';

UPDATE settings
SET category_order = 5
WHERE category_key = 'misc';

UPDATE settings
SET category_key = 'email',
    category_label = 'Email Settings',
    category_description = 'Manage SMTP credentials, sendmail preferences, and email templates.',
    section_key = 'email-smtp',
    section_label = 'SMTP Settings',
    section_description = 'Configure how outbound email is delivered to your contacts.',
    category_order = 2,
    section_order = 1,
    field_order = 90,
    code = 'email.from_address',
    label = 'From Email Address',
    description = 'Default email address used in the “From” header for notifications.',
    value_type = 'STRING'
WHERE code = 'email.sender';

UPDATE settings
SET category_key = 'email',
    category_label = 'Email Settings',
    category_description = 'Manage SMTP credentials, sendmail preferences, and email templates.',
    section_key = 'email-smtp',
    section_label = 'SMTP Settings',
    section_description = 'Configure how outbound email is delivered to your contacts.',
    category_order = 2,
    section_order = 1,
    field_order = 40,
    label = 'SMTP Host',
    description = 'Server hostname used to relay emails.'
WHERE code = 'email.smtp_host';

UPDATE settings
SET category_key = 'email',
    category_label = 'Email Settings',
    category_description = 'Manage SMTP credentials, sendmail preferences, and email templates.',
    section_key = 'email-smtp',
    section_label = 'SMTP Settings',
    section_description = 'Configure how outbound email is delivered to your contacts.',
    category_order = 2,
    section_order = 1,
    field_order = 50,
    label = 'SMTP Port',
    description = 'Port number for the SMTP service.',
    value_type = 'NUMBER'
WHERE code = 'email.smtp_port';

UPDATE settings
SET category_key = 'email',
    category_label = 'Email Settings',
    category_description = 'Manage SMTP credentials, sendmail preferences, and email templates.',
    section_key = 'email-smtp',
    section_label = 'SMTP Settings',
    section_description = 'Configure how outbound email is delivered to your contacts.',
    category_order = 2,
    section_order = 1,
    field_order = 20,
    code = 'email.smtp_encryption',
    label = 'SMTP Encryption',
    description = 'Encryption protocol used when connecting to the SMTP server.',
    value_type = 'STRING',
    value = CASE
        WHEN value IS NULL OR TRIM(value) = '' THEN 'none'
        WHEN LOWER(TRIM(value)) IN ('true', '1', 'yes', 'tls') THEN 'tls'
        ELSE 'none'
    END,
    options_json = '[{"value":"none","label":"None"},{"value":"ssl","label":"SSL"},{"value":"tls","label":"STARTTLS"}]'
WHERE code = 'email.use_tls';

INSERT INTO settings (
    category_key, category_label, category_description,
    section_key, section_label, section_description,
    code, label, description, value, value_type, options_json, editable,
    category_order, section_order, field_order
) VALUES
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-smtp', 'SMTP Settings', 'Configure how outbound email is delivered to your contacts.',
 'email.driver', 'Mail Driver', 'Delivery engine that should be used when sending emails.', 'smtp', 'STRING', '[{"value":"smtp","label":"SMTP"},{"value":"sendmail","label":"Sendmail"},{"value":"phpmailer","label":"PHP Mail"}]', TRUE,
 2, 1, 10),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-smtp', 'SMTP Settings', 'Configure how outbound email is delivered to your contacts.',
 'email.sendmail_path', 'Sendmail Path', 'Filesystem path to the sendmail binary (used when the sendmail driver is selected).', '/usr/sbin/sendmail -bs', 'STRING', NULL, TRUE,
 2, 1, 30),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-smtp', 'SMTP Settings', 'Configure how outbound email is delivered to your contacts.',
 'email.smtp_username', 'SMTP Username', 'Credential used to authenticate with the SMTP server.', 'support@demo.io', 'STRING', NULL, TRUE,
 2, 1, 60),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-smtp', 'SMTP Settings', 'Configure how outbound email is delivered to your contacts.',
 'email.smtp_password', 'SMTP Password', 'Password or app-specific token for the SMTP account.', '', 'STRING', NULL, TRUE,
 2, 1, 70),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-smtp', 'SMTP Settings', 'Configure how outbound email is delivered to your contacts.',
 'email.from_name', 'Sender Name', 'Friendly name displayed alongside the sender email address.', 'Support Team', 'STRING', NULL, TRUE,
 2, 1, 80),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-smtp', 'SMTP Settings', 'Configure how outbound email is delivered to your contacts.',
 'email.reply_to', 'Reply-To Address', 'Optional address that replies should be sent to.', '', 'STRING', NULL, TRUE,
 2, 1, 100),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-smtp', 'SMTP Settings', 'Configure how outbound email is delivered to your contacts.',
 'email.bcc_all', 'BCC Recipients', 'Comma-separated list of recipients that should receive a blind copy of every outgoing email.', '', 'STRING', NULL, TRUE,
 2, 1, 110),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-templates', 'Email Templates', 'Customize wrappers and signatures that surround email content.',
 'email.signature', 'Email Signature', 'Default signature appended to outgoing emails.', CONCAT('Best regards,', CHAR(10), 'Support Team'), 'TEXT', NULL, TRUE,
 2, 2, 10),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-templates', 'Email Templates', 'Customize wrappers and signatures that surround email content.',
 'email.header_html', 'Predefined Header', 'HTML rendered above email bodies.', '', 'TEXT', NULL, TRUE,
 2, 2, 20),
('email', 'Email Settings', 'Manage SMTP credentials, sendmail preferences, and email templates.',
 'email-templates', 'Email Templates', 'Customize wrappers and signatures that surround email content.',
 'email.footer_html', 'Predefined Footer', 'HTML rendered below email bodies.', '', 'TEXT', NULL, TRUE,
 2, 2, 30);
