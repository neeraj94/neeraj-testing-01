package com.example.rbac.admin.brands.controller;

import com.example.rbac.admin.brands.dto.BrandLogoUploadResponse;
import com.example.rbac.admin.brands.service.BrandLogoStorageService;
import com.example.rbac.admin.brands.service.BrandLogoStorageService.StoredLogo;
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
@RequestMapping("/brands/assets")
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

    @GetMapping("/{key:.+}")
    public ResponseEntity<Resource> serveLogo(@PathVariable("key") String key) {
        Resource resource = storageService.load(key);
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

    private void recordUpload(UploadedFileModule module, StoredLogo stored, String url) {
        try {
            uploadedFileService.recordUpload(module, stored.key(), url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
        } catch (Exception ex) {
            LOGGER.debug("Failed to record uploaded file for module {}: {}", module, ex.getMessage());
        }
    }
}
