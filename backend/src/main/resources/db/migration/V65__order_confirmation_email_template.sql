-- Seed order confirmation email template for customers
INSERT INTO email_templates (code, name, category, description, subject, body_html, enabled)
VALUES
    (
        'order_confirmation_customer',
        'Order confirmation',
        'Order Notifications',
        'Sent to customers when an order is successfully placed.',
        'Your order {{order_number}} is confirmed',
        '<p>Hi {{customer_name}},</p>\n<p>Thanks for shopping with <strong>{{app_name}}</strong>. Your order <strong>{{order_number}}</strong> was received on {{order_date}} and is currently {{order_status}}.</p>\n<h2 style="margin-top:24px;font-size:16px;font-weight:600;">Order summary</h2>\n<div style="margin:12px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background-color:#f8fafc;">{{order_items_table}}</div>\n<p style="font-size:15px;font-weight:600;">Order total: {{order_total}}</p>\n<div style="display:flex;flex-wrap:wrap;gap:24px;margin-top:24px;">\n  <div style="flex:1 1 240px;">\n    <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;">Billing information</h3>\n    <p style="margin:0;white-space:pre-line;">{{billing_address}}</p>\n  </div>\n  <div style="flex:1 1 240px;">\n    <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;">Shipping information</h3>\n    <p style="margin:0;white-space:pre-line;">{{shipping_address}}</p>\n  </div>\n</div>\n<p style="margin-top:16px;"><strong>Shipping method:</strong> {{shipping_method}}<br/><strong>Payment method:</strong> {{payment_method}}</p>\n<p style="margin-top:16px;white-space:pre-line;">{{customer_notes}}</p>\n<p style="margin-top:24px;">If you have any questions, reply to this email or contact us at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>\n<p class="signature">{{email_signature}}</p>',
        1
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    category = VALUES(category),
    description = VALUES(description),
    subject = VALUES(subject),
    body_html = VALUES(body_html),
    enabled = VALUES(enabled);
