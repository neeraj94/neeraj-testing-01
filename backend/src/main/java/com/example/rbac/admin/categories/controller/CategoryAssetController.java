package com.example.rbac.admin.categories.controller;

import com.example.rbac.admin.categories.service.CategoryAssetStorageService;
import com.example.rbac.admin.categories.service.CategoryAssetStorageService.AssetType;
import com.example.rbac.admin.categories.service.CategoryAssetStorageService.StoredAsset;
import com.example.rbac.admin.uploadedfile.model.UploadedFileModule;
import com.example.rbac.admin.uploadedfile.service.UploadedFileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
@RequestMapping("/categories/assets")
public class CategoryAssetController {

    private static final Logger LOGGER = LoggerFactory.getLogger(CategoryAssetController.class);

    private final CategoryAssetStorageService storageService;
    private final UploadedFileService uploadedFileService;

    public CategoryAssetController(CategoryAssetStorageService storageService,
                                   UploadedFileService uploadedFileService) {
        this.storageService = storageService;
        this.uploadedFileService = uploadedFileService;
    }

    @PostMapping("/{type}")
    @PreAuthorize("hasAnyAuthority('CATEGORY_CREATE','CATEGORY_UPDATE')")
    public CategoryAssetUploadResponse upload(@PathVariable("type") String type,
                                              @RequestParam("file") MultipartFile file) {
        AssetType assetType = AssetType.fromPathSegment(type);
        StoredAsset stored = storageService.store(file, assetType);
        String url = storageService.publicUrlForKey(assetType, stored.key());
        recordUpload(assetType, stored, url);
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

    private void recordUpload(AssetType assetType, StoredAsset stored, String url) {
        try {
            UploadedFileModule module = switch (assetType) {
                case ICON -> UploadedFileModule.CATEGORY_ICON;
                case BANNER -> UploadedFileModule.CATEGORY_BANNER;
                case COVER -> UploadedFileModule.CATEGORY_COVER;
            };
            uploadedFileService.recordUpload(module, stored.key(), url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
        } catch (Exception ex) {
            LOGGER.debug("Failed to record uploaded category asset {}: {}", assetType, ex.getMessage());
        }
    }
}
