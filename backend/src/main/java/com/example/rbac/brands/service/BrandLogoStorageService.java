package com.example.rbac.brands.service;

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
public class BrandLogoStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "svg");

    private final Path storageRoot;
    private final String publicBaseUrl;

    public BrandLogoStorageService(
            @Value("${app.brand.logo-storage-path:storage/brands/logos}") String storagePath,
            @Value("${app.brand.public-base-url:http://localhost:8080}") String publicBaseUrl) {
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
        try {
            Files.createDirectories(this.storageRoot);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize brand logo storage directory", ex);
        }
    }

    public StoredLogo store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Logo file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only image uploads are allowed for brand logos");
        }
        String extension = resolveExtension(file);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported logo format. Allowed: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
        try {
            Files.createDirectories(storageRoot);
            String filename = UUID.randomUUID() + "." + extension;
            Path target = storageRoot.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredLogo(filename, file.getOriginalFilename(), contentType, file.getSize());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store brand logo");
        }
    }

    public Resource load(String key) {
        if (!StringUtils.hasText(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid logo key");
        }
        Path candidate = storageRoot.resolve(key).normalize();
        if (!candidate.startsWith(storageRoot)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid logo path");
        }
        try {
            Resource resource = new UrlResource(candidate.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (MalformedURLException ignored) {
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "Brand logo not found");
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
            throw new ApiException(HttpStatus.BAD_REQUEST, "Logo file must include a supported extension");
        }
        return extension.toLowerCase();
    }

    public record StoredLogo(String key, String originalFilename, String mimeType, long sizeBytes) {
    }

    public String publicUrlForKey(String key) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return resolvePublicUrl("/api/v1/brands/assets/" + key);
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
