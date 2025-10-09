-- Provide richer defaults for email template chrome
UPDATE settings
SET value = '<div style="padding:24px;background-color:#0f172a;color:#ffffff;text-align:left;"><h1 style="margin:0;font-size:20px;font-weight:600;">RBAC Dashboard</h1><p style="margin:8px 0 0;font-size:14px;">Automated update from your workspace.</p></div>'
WHERE code = 'email.header_html'
  AND (value IS NULL OR TRIM(value) = '');

UPDATE settings
SET value = '<div style="padding:20px;background-color:#f8fafc;color:#475569;font-size:12px;line-height:1.5;text-align:left;"><p style="margin:0;">You are receiving this email because your address is registered with RBAC Dashboard.</p><p style="margin:8px 0 0;">RBAC Dashboard, 123 Demo Street, Anywhere</p></div>'
WHERE code = 'email.footer_html'
  AND (value IS NULL OR TRIM(value) = '');
