package com.example.rbac.blog.service;

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
public class BlogMediaStorageService {

    private final Path storageRoot;

    public BlogMediaStorageService(@Value("${app.blog.storage-path:storage/blog}") String storagePath) {
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize blog storage directory", ex);
        }
    }

    public String store(MultipartFile file) {
        try {
            String extension = extractExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID() + (extension == null ? "" : "." + extension);
            Path destination = storageRoot.resolve(filename);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store media file");
        }
    }

    public Resource load(String key) {
        try {
            Path path = storageRoot.resolve(key).normalize();
            if (!path.startsWith(storageRoot)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid media path");
            }
            Resource resource = new UrlResource(path.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new ApiException(HttpStatus.NOT_FOUND, "Media not found");
        } catch (MalformedURLException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid media path");
        }
    }

    public void delete(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            Path path = storageRoot.resolve(key).normalize();
            if (path.startsWith(storageRoot)) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ex) {
            // ignore deletion errors
        }
    }

    private String extractExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }
        int index = filename.lastIndexOf('.');
        if (index <= 0 || index == filename.length() - 1) {
            return null;
        }
        return filename.substring(index + 1).toLowerCase();
    }
}
