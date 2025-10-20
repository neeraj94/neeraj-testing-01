package com.example.rbac.admin.badges.service;

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
import java.util.Set;
import java.util.UUID;

@Service
public class BadgeIconStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "svg");

    private final Path storageRoot;
    private final String publicBaseUrl;

    public BadgeIconStorageService(
            @Value("${app.badge.icon-storage-path:storage/catalog/badges/icons}") String storagePath,
            @Value("${app.badge.public-base-url:${app.brand.public-base-url:${APP_PUBLIC_BASE_URL:http://localhost:8080}}}")
            String publicBaseUrl
    ) {
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize badge icon storage directory", ex);
        }
    }

    public StoredIcon store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Icon file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only image uploads are allowed for badge icons");
        }
        String extension = resolveExtension(file);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported icon format. Allowed: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
        try {
            Files.createDirectories(storageRoot);
            String filename = UUID.randomUUID() + "." + extension;
            Path target = storageRoot.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredIcon(filename, file.getOriginalFilename(), contentType, file.getSize());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store badge icon");
        }
    }

    public Resource load(String key) {
        if (!StringUtils.hasText(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid icon key");
        }
        Path candidate = storageRoot.resolve(key).normalize();
        if (!candidate.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid icon path");
        }
        try {
            Resource resource = new UrlResource(candidate.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (MalformedURLException ignored) {
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "Badge icon not found");
    }

    private String resolveExtension(MultipartFile file) {
        String filename = file.getOriginalFilename();
        String extension = StringUtils.getFilenameExtension(filename);
        if (!StringUtils.hasText(extension) && file.getContentType() != null) {
            String contentType = file.getContentType().toLowerCase();
            if (contentType.equals("image/jpeg")) {
                extension = "jpg";
            } else if (contentType.equals("image/png")) {
                extension = "png";
            } else if (contentType.equals("image/gif")) {
                extension = "gif";
            } else if (contentType.equals("image/webp")) {
                extension = "webp";
            } else if (contentType.equals("image/svg+xml")) {
                extension = "svg";
            }
        }
        if (!StringUtils.hasText(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Icon file must include a supported extension");
        }
        return extension.toLowerCase();
    }

    public record StoredIcon(String key, String originalFilename, String mimeType, long sizeBytes) {
    }

    public String publicUrlForKey(String key) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return resolvePublicUrl("/api/v1/badges/assets/" + key);
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
}
