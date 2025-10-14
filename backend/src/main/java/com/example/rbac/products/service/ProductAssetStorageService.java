package com.example.rbac.products.service;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.uploadedfile.model.UploadedFileModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@Service
public class ProductAssetStorageService {

    private static final Set<String> IMAGE_EXTENSIONS = Set.of("png", "jpg", "jpeg", "gif", "webp", "svg");
    private static final Set<String> DOCUMENT_EXTENSIONS = Set.of("pdf");

    public enum AssetType {
        GALLERY_IMAGE("gallery", "gallery", FileKind.IMAGE, UploadedFileModule.PRODUCT_GALLERY_IMAGE),
        THUMBNAIL("thumbnails", "thumbnail", FileKind.IMAGE, UploadedFileModule.PRODUCT_THUMBNAIL),
        META_IMAGE("meta", "meta-image", FileKind.IMAGE, UploadedFileModule.PRODUCT_META_IMAGE),
        PDF_SPEC("specifications", "pdf", FileKind.DOCUMENT, UploadedFileModule.PRODUCT_PDF_SPEC),
        VARIANT_IMAGE("variants", "variant", FileKind.IMAGE, UploadedFileModule.PRODUCT_VARIANT_IMAGE);

        private final String folder;
        private final String pathSegment;
        private final FileKind kind;
        private final UploadedFileModule module;

        AssetType(String folder, String pathSegment, FileKind kind, UploadedFileModule module) {
            this.folder = folder;
            this.pathSegment = pathSegment;
            this.kind = kind;
            this.module = module;
        }

        public String getFolder() {
            return folder;
        }

        public String getPathSegment() {
            return pathSegment;
        }

        public FileKind getKind() {
            return kind;
        }

        public UploadedFileModule getModule() {
            return module;
        }

        public static AssetType fromPathSegment(String value) {
            if (!StringUtils.hasText(value)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown product asset type");
            }
            String normalized = value.trim().toLowerCase(Locale.ENGLISH);
            return Arrays.stream(values())
                    .filter(type -> type.pathSegment.equalsIgnoreCase(normalized))
                    .findFirst()
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unsupported product asset type"));
        }
    }

    private enum FileKind {
        IMAGE,
        DOCUMENT
    }

    private final Path storageRoot;
    private final Map<AssetType, Path> directories = new EnumMap<>(AssetType.class);
    private final String publicBaseUrl;

    public ProductAssetStorageService(
            @Value("${app.product.asset-storage-path:storage/catalog/products}") String storagePath,
            @Value("${app.product.public-base-url:${app.brand.public-base-url:${APP_PUBLIC_BASE_URL:http://localhost:8080}}}") String publicBaseUrl
    ) {
        this.storageRoot = Paths.get(storagePath).toAbsolutePath().normalize();
        this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
        try {
            Files.createDirectories(this.storageRoot);
            for (AssetType type : AssetType.values()) {
                Path directory = this.storageRoot.resolve(type.getFolder());
                Files.createDirectories(directory);
                directories.put(type, directory);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to initialize product asset storage directory", ex);
        }
    }

    public List<StoredAsset> storeAll(List<MultipartFile> files, AssetType type) {
        if (CollectionUtils.isEmpty(files)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one file is required");
        }
        List<StoredAsset> stored = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            stored.add(store(file, type));
        }
        if (stored.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No valid files were provided");
        }
        return stored;
    }

    public StoredAsset store(MultipartFile file, AssetType type) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required");
        }
        return switch (type.getKind()) {
            case IMAGE -> storeImage(file, type);
            case DOCUMENT -> storeDocument(file, type);
        };
    }

    private StoredAsset storeImage(MultipartFile file, AssetType type) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ENGLISH).startsWith("image/")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only image uploads are allowed for this asset type");
        }
        String extension = resolveExtension(file, IMAGE_EXTENSIONS);
        return copyToStorage(file, type, extension);
    }

    private StoredAsset storeDocument(MultipartFile file, AssetType type) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equalsIgnoreCase("application/pdf")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only PDF files are allowed for specification uploads");
        }
        String extension = resolveExtension(file, DOCUMENT_EXTENSIONS);
        return copyToStorage(file, type, extension);
    }

    private StoredAsset copyToStorage(MultipartFile file, AssetType type, String extension) {
        try {
            Path directory = directories.get(type);
            if (directory == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported product asset destination");
            }
            Files.createDirectories(directory);
            String filename = UUID.randomUUID() + "." + extension;
            Path target = directory.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return new StoredAsset(type, filename, file.getOriginalFilename(), file.getContentType(), file.getSize(), type.getModule());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store product asset");
        }
    }

    public Resource load(AssetType type, String key) {
        if (!StringUtils.hasText(key)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid asset key");
        }
        Path directory = directories.get(type);
        if (directory == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported product asset type");
        }
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
        throw new ApiException(HttpStatus.NOT_FOUND, "Product asset not found");
    }

    public String publicUrlForKey(AssetType type, String key) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        return resolvePublicUrl("/api/v1/products/assets/" + type.getPathSegment() + "/" + key);
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

    private String resolveExtension(MultipartFile file, Set<String> allowed) {
        String filename = file.getOriginalFilename();
        String extension = StringUtils.getFilenameExtension(filename);
        if (!StringUtils.hasText(extension) && file.getContentType() != null) {
            extension = switch (file.getContentType().toLowerCase(Locale.ENGLISH)) {
                case "image/jpeg" -> "jpg";
                case "image/png" -> "png";
                case "image/gif" -> "gif";
                case "image/webp" -> "webp";
                case "image/svg+xml" -> "svg";
                case "application/pdf" -> "pdf";
                default -> null;
            };
        }
        if (!StringUtils.hasText(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File extension is required");
        }
        String normalized = extension.toLowerCase(Locale.ENGLISH);
        if (!allowed.contains(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported file format");
        }
        return normalized;
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

    public record StoredAsset(AssetType type, String key, String originalFilename, String mimeType, long sizeBytes, UploadedFileModule module) {
    }
}
