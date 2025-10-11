package com.example.rbac.categories.service;

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
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class CategoryAssetStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "svg");

    public enum AssetType {
        BANNER("banners"),
        ICON("icons"),
        COVER("covers");

        private final String folder;

        AssetType(String folder) {
            this.folder = folder;
        }

        public String getFolder() {
            return folder;
        }

        public static AssetType fromPathSegment(String value) {
            for (AssetType type : values()) {
                if (type.name().equalsIgnoreCase(value)) {
                    return type;
                }
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported category asset type");
        }
    }

    private final Path storageRoot;
    private final String publicBaseUrl;
    private final Map<AssetType, Path> typeDirectories = new EnumMap<>(AssetType.class);

    public CategoryAssetStorageService(
            @Value("${app.category.asset-storage-path:storage/catalog/categories}") String storagePath,
            @Value("${app.category.public-base-url:${app.brand.public-base-url:${APP_PUBLIC_BASE_URL:http://localhost:8080}}}") String publicBaseUrl
    ) {
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
        try {
            Files.createDirectories(this.storageRoot);
            for (AssetType type : AssetType.values()) {
                Path directory = this.storageRoot.resolve(type.getFolder());
                Files.createDirectories(directory);
                typeDirectories.put(type, directory);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize category asset storage directory", ex);
        }
    }

    public StoredAsset store(MultipartFile file, AssetType type) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image file is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only image uploads are allowed for category assets");
        }
        String extension = resolveExtension(file);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported image format. Allowed: " + String.join(", ", ALLOWED_EXTENSIONS));
        }
        try {
            Path directory = typeDirectories.get(type);
            Files.createDirectories(directory);
            String filename = UUID.randomUUID() + "." + extension;
            Path target = directory.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredAsset(type, filename, file.getOriginalFilename(), contentType, file.getSize());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store category asset");
        }
    }

    public Resource load(AssetType type, String key) {
        if (!StringUtils.hasText(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid asset key");
        }
        Path directory = typeDirectories.get(type);
        Path candidate = directory.resolve(key).normalize();
        if (!candidate.startsWith(directory)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid asset path");
        }
        try {
            Resource resource = new UrlResource(candidate.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (MalformedURLException ignored) {
        }
        throw new ApiException(HttpStatus.NOT_FOUND, "Category asset not found");
    }

    public String publicUrlForKey(AssetType type, String key) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return resolvePublicUrl("/api/v1/categories/assets/" + type.name().toLowerCase() + "/" + key);
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
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image file must include a supported extension");
        }
        return extension.toLowerCase();
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

    public record StoredAsset(AssetType type, String key, String originalFilename, String mimeType, long sizeBytes) {
    }
}
