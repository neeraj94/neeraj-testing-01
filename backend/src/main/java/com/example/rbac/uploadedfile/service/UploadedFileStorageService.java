package com.example.rbac.uploadedfile.service;

import com.example.rbac.common.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;

@Service
public class UploadedFileStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

    private final Path storageRoot;
    private final String publicBaseUrl;

    public UploadedFileStorageService(
            @Value("${app.uploaded-file.storage-path:storage/uploaded-files}") String storagePath,
            @Value("${app.uploaded-file.public-base-url:${APP_PUBLIC_BASE_URL:http://localhost:8080}}") String publicBaseUrl
    ) {
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize uploaded file storage directory", ex);
        }
    }

    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one file to upload");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File exceeds the 25 MB upload limit");
        }
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (StringUtils.hasText(extension)) {
            extension = extension.toLowerCase(Locale.ROOT);
        }
        try {
            Files.createDirectories(storageRoot);
            String filename = UUID.randomUUID().toString();
            if (StringUtils.hasText(extension)) {
                filename = filename + "." + extension;
            }
            Path destination = storageRoot.resolve(filename);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return new StoredFile(filename,
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store uploaded file");
        }
    }

    public Resource loadAsResource(String storageKey) {
        if (!StringUtils.hasText(storageKey)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid storage key");
        }
        Path candidate = storageRoot.resolve(storageKey).normalize();
        if (!candidate.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid storage path");
        }
        try {
            Resource resource = new UrlResource(candidate.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (MalformedURLException ignored) {
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
    }

    public String publicUrlForKey(String key) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return resolvePublicUrl("/api/v1/uploaded-files/assets/" + key);
    }

    public String resolvePublicUrl(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.matches("(?i)^[a-z][a-z0-9+.-]*://.*")) {
            return trimmed;
        }
        if (!StringUtils.hasText(publicBaseUrl)) {
            return trimmed;
        }
        String normalizedPath = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
        return publicBaseUrl + normalizedPath;
    }

    private String normalizeBaseUrl(String baseUrl) {
        if (!StringUtils.hasText(baseUrl)) {
            return null;
        }
        String normalized = baseUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    public record StoredFile(String key, String originalFilename, String mimeType, long sizeBytes) {
    }
}
