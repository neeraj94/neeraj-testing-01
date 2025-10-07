CREATE TABLE gallery_folders (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(160) NOT NULL,
    path VARCHAR(500) NOT NULL UNIQUE,
    parent_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_gallery_folders_parent FOREIGN KEY (parent_id) REFERENCES gallery_folders (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_gallery_folders_parent ON gallery_folders(parent_id);

CREATE TABLE gallery_files (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    folder_id BIGINT NULL,
    uploader_id BIGINT NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    extension VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_gallery_files_folder FOREIGN KEY (folder_id) REFERENCES gallery_folders (id) ON DELETE SET NULL,
    CONSTRAINT fk_gallery_files_uploader FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_gallery_files_folder ON gallery_files(folder_id);
CREATE INDEX idx_gallery_files_uploader ON gallery_files(uploader_id);
CREATE INDEX idx_gallery_files_created_at ON gallery_files(created_at);
CREATE INDEX idx_gallery_files_extension ON gallery_files(extension);

INSERT IGNORE INTO permissions (code, name) VALUES
    ('GALLERY_VIEW_OWN', 'Gallery: View Own Files'),
    ('GALLERY_VIEW_ALL', 'Gallery: View All Files'),
    ('GALLERY_CREATE', 'Gallery: Upload Files'),
    ('GALLERY_EDIT_ALL', 'Gallery: Edit Files'),
    ('GALLERY_DELETE_ALL', 'Gallery: Delete Any Files'),
    ('GALLERY_DELETE_OWN', 'Gallery: Delete Own Files');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'GALLERY_VIEW_OWN',
    'GALLERY_VIEW_ALL',
    'GALLERY_CREATE',
    'GALLERY_EDIT_ALL',
    'GALLERY_DELETE_ALL',
    'GALLERY_DELETE_OWN'
)
WHERE r.code = 'SUPER_ADMIN';

INSERT INTO settings (
    category_key, category_label, category_description,
    section_key, section_label, section_description,
    code, label, description, value, value_type, options_json, editable,
    category_order, section_order, field_order
) VALUES (
    'files', 'File Library', 'Preferences for the internal gallery and file library.',
    'gallery', 'Gallery Settings', 'Upload and validation rules for gallery content.',
    'gallery.allowed_extensions', 'Allowed File Extensions', 'Comma-separated list of file extensions that can be uploaded to the gallery.',
    'png,jpg,jpeg,pdf,docx,xlsx,mp4', 'STRING', NULL, TRUE,
    5, 1, 1
)
ON DUPLICATE KEY UPDATE value = VALUES(value);
