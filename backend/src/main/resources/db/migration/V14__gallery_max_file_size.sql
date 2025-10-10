INSERT INTO settings (
    category_key, category_label, category_description,
    section_key, section_label, section_description,
    code, label, description, value, value_type, options_json, editable,
    category_order, section_order, field_order
) VALUES (
    'files', 'File Library', 'Preferences for the internal gallery and file library.',
    'gallery', 'Gallery Settings', 'Upload and validation rules for gallery content.',
    'gallery.max_file_size_mb', 'Maximum File Size (MB)', 'Largest file size, in megabytes, that can be uploaded to the gallery.',
    '50', 'NUMBER', NULL, TRUE,
    5, 1, 2
)
ON DUPLICATE KEY UPDATE value = VALUES(value), value_type = VALUES(value_type), label = VALUES(label), description = VALUES(description);
