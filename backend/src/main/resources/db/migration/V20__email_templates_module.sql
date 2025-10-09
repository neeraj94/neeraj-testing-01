-- Create email templates table and seed initial templates
CREATE TABLE IF NOT EXISTS email_templates (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(120) NOT NULL,
    description VARCHAR(255),
    subject VARCHAR(200) NOT NULL,
    body_html LONGTEXT NOT NULL,
    enabled TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO email_templates (code, name, category, description, subject, body_html, enabled)
VALUES
    (
        'user_signup_welcome',
        'New User Welcome',
        'User Lifecycle',
        'Sent to new users after their account is provisioned.',
        'Welcome to {{app_name}}',
        '<p>Hello {{user_full_name}},</p><p>Welcome to <strong>{{app_name}}</strong>! Your account has been created with the email <a href="mailto:{{user_email}}">{{user_email}}</a>.</p><p>You can sign in any time at <a href="{{login_url}}">{{login_url}}</a>.</p><p class="signature">{{email_signature}}</p>',
        1
    ),
    (
        'staff_verification_request',
        'Staff User Verification',
        'User Lifecycle',
        'Sends a verification link to staff members who must confirm their account.',
        'Verify your access to {{app_name}}',
        '<p>Hi {{user_full_name}},</p><p>Your staff account request for <strong>{{app_name}}</strong> is almost complete.</p><p>Please confirm your email by clicking the button below:</p><p><a href="{{verification_link}}" style="display:inline-block;padding:10px 18px;background-color:#2563EB;color:#ffffff;border-radius:6px;text-decoration:none;">Verify my account</a></p><p>This link will expire on {{verification_expires_at}}.</p><p>If you did not request access, you can safely ignore this email.</p><p class="signature">{{email_signature}}</p>',
        1
    )
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    category = VALUES(category),
    description = VALUES(description),
    subject = VALUES(subject),
    body_html = VALUES(body_html);
