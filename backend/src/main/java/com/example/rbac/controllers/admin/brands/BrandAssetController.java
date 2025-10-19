package com.example.rbac.controllers.admin.brands;

import com.example.rbac.brands.dto.BrandLogoUploadResponse;
import com.example.rbac.brands.service.BrandLogoStorageService;
import com.example.rbac.brands.service.BrandLogoStorageService.StoredLogo;
import com.example.rbac.uploadedfile.model.UploadedFileModule;
import com.example.rbac.uploadedfile.service.UploadedFileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/brands/assets")
public class BrandAssetController {

    private static final Logger LOGGER = LoggerFactory.getLogger(BrandAssetController.class);

    private final BrandLogoStorageService storageService;
    private final UploadedFileService uploadedFileService;

    public BrandAssetController(BrandLogoStorageService storageService,
                               UploadedFileService uploadedFileService) {
        this.storageService = storageService;
        this.uploadedFileService = uploadedFileService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('BRAND_CREATE','BRAND_UPDATE')")
    public BrandLogoUploadResponse uploadLogo(@RequestParam("file") MultipartFile file) {
        StoredLogo stored = storageService.store(file);
        String url = storageService.publicUrlForKey(stored.key());
        recordUpload(UploadedFileModule.BRAND_LOGO, stored, url);
        return new BrandLogoUploadResponse(url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
    }

    private void recordUpload(UploadedFileModule module, StoredLogo stored, String url) {
        try {
            uploadedFileService.recordUpload(module, stored.key(), url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
        } catch (Exception ex) {
            LOGGER.debug("Failed to record uploaded file for module {}: {}", module, ex.getMessage());
        }
    }
}
