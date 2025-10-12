CREATE TABLE uploaded_files (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    module VARCHAR(100) NOT NULL,
    feature_name VARCHAR(150),
    context_label VARCHAR(150),
    storage_key VARCHAR(255),
    public_url VARCHAR(500),
    original_filename VARCHAR(255),
    mime_type VARCHAR(150),
    file_type VARCHAR(50),
    size_bytes BIGINT,
    uploaded_by_id BIGINT,
    uploaded_by_name VARCHAR(200),
    uploaded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_uploaded_files_user FOREIGN KEY (uploaded_by_id) REFERENCES users (id)
);

CREATE INDEX idx_uploaded_files_module ON uploaded_files(module);
CREATE INDEX idx_uploaded_files_feature ON uploaded_files(feature_name);
CREATE INDEX idx_uploaded_files_file_type ON uploaded_files(file_type);
CREATE INDEX idx_uploaded_files_uploaded_at ON uploaded_files(uploaded_at);
CREATE INDEX idx_uploaded_files_uploader ON uploaded_files(uploaded_by_id);

INSERT INTO permissions (code, name) VALUES
    ('UPLOADED_FILE_VIEW', 'Uploaded files: View'),
    ('UPLOADED_FILE_MANAGE', 'Uploaded files: Manage');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('UPLOADED_FILE_VIEW', 'UPLOADED_FILE_MANAGE')
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
