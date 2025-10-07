package com.example.rbac.gallery.service;

import com.example.rbac.common.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class GalleryStorageService {

    private final Path storageRoot;

    public GalleryStorageService(@Value("${app.gallery.storage-path:storage/gallery}") String storagePath) {
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize gallery storage directory", ex);
        }
    }

    public String store(MultipartFile file, String folderPath, String extension) {
        try {
            Path targetDirectory = resolveFolderPath(folderPath);
            Files.createDirectories(targetDirectory);
            String filename = UUID.randomUUID() + (extension == null || extension.isBlank() ? "" : "." + extension);
            Path destination = targetDirectory.resolve(filename);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return storageRoot.relativize(destination).toString().replace('\\', '/');
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store uploaded file");
        }
    }

    public Resource loadAsResource(String storageKey) {
        try {
            Path filePath = storageRoot.resolve(storageKey).normalize();
            if (!filePath.startsWith(storageRoot)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid storage path");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
        } catch (MalformedURLException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid storage path");
        }
    }

    public void delete(String storageKey) {
        try {
            if (storageKey == null || storageKey.isBlank()) {
                return;
            }
            Path filePath = storageRoot.resolve(storageKey).normalize();
            if (filePath.startsWith(storageRoot)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException ex) {
            // ignore deletion errors to avoid blocking the request
        }
    }

    private Path resolveFolderPath(String folderPath) {
        if (folderPath == null || folderPath.isBlank() || "/".equals(folderPath)) {
            return storageRoot;
        }
        String sanitized = folderPath;
        if (sanitized.startsWith("/")) {
            sanitized = sanitized.substring(1);
        }
        sanitized = sanitized.replace('\\', '/');
        return storageRoot.resolve(sanitized).normalize();
    }
}
