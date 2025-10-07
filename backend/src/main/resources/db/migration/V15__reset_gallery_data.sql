DELETE FROM gallery_files;
DELETE FROM gallery_folders;
ALTER TABLE gallery_files AUTO_INCREMENT = 1;
ALTER TABLE gallery_folders AUTO_INCREMENT = 1;
