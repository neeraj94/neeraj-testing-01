ALTER TABLE gallery_folders
    ADD COLUMN owner_id BIGINT NULL;

ALTER TABLE gallery_folders
    ADD CONSTRAINT fk_gallery_folders_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX idx_gallery_folders_owner ON gallery_folders(owner_id);

UPDATE gallery_folders gf
LEFT JOIN gallery_files gfi ON gfi.folder_id = gf.id
SET gf.owner_id = gfi.uploader_id
WHERE gf.owner_id IS NULL
  AND gfi.uploader_id IS NOT NULL;
