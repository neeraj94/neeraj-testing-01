package com.example.rbac.categories.controller;

import com.example.rbac.categories.service.CategoryAssetStorageService;
import com.example.rbac.categories.service.CategoryAssetStorageService.AssetType;
import com.example.rbac.categories.service.CategoryAssetStorageService.StoredAsset;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/v1/categories/assets")
public class CategoryAssetController {

    private final CategoryAssetStorageService storageService;

    public CategoryAssetController(CategoryAssetStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping("/{type}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_CREATE','CATEGORY_UPDATE')")
    public CategoryAssetUploadResponse upload(@PathVariable("type") String type,
                                              @RequestParam("file") MultipartFile file) {
        AssetType assetType = AssetType.fromPathSegment(type);
        StoredAsset stored = storageService.store(file, assetType);
        String url = storageService.publicUrlForKey(assetType, stored.key());
        return new CategoryAssetUploadResponse(assetType.name(), url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
    }

    @GetMapping("/{type}/{key:.+}")
    public ResponseEntity<Resource> serve(@PathVariable("type") String type,
                                           @PathVariable("key") String key) {
        AssetType assetType = AssetType.fromPathSegment(type);
        Resource resource = storageService.load(assetType, key);
        String filename = StringUtils.hasText(resource.getFilename()) ? resource.getFilename() : key;
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            String contentType = resource.getURL().openConnection().getContentType();
            if (contentType != null) {
                mediaType = MediaType.parseMediaType(contentType);
            }
        } catch (Exception ignored) {
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + encoded + "\"")
                .body(resource);
    }

    public record CategoryAssetUploadResponse(String type, String url, String originalFilename, String mimeType, long sizeBytes) {
    }
}
