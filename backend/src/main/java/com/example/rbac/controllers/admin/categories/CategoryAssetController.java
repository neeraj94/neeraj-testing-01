package com.example.rbac.controllers.admin.categories;

import com.example.rbac.categories.service.CategoryAssetStorageService;
import com.example.rbac.categories.service.CategoryAssetStorageService.AssetType;
import com.example.rbac.categories.service.CategoryAssetStorageService.StoredAsset;
import com.example.rbac.uploadedfile.model.UploadedFileModule;
import com.example.rbac.uploadedfile.service.UploadedFileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/categories/assets")
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
