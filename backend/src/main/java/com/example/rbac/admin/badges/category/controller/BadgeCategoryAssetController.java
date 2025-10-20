package com.example.rbac.admin.badges.category.controller;

import com.example.rbac.badges.category.service.BadgeCategoryIconStorageService;
import com.example.rbac.badges.category.service.BadgeCategoryIconStorageService.StoredIcon;
import com.example.rbac.uploadedfile.model.UploadedFileModule;
import com.example.rbac.uploadedfile.service.UploadedFileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/badge-categories/assets")
public class BadgeCategoryAssetController {

    private static final Logger LOGGER = LoggerFactory.getLogger(BadgeCategoryAssetController.class);

    private final BadgeCategoryIconStorageService storageService;
    private final UploadedFileService uploadedFileService;

    public BadgeCategoryAssetController(BadgeCategoryIconStorageService storageService,
                                       UploadedFileService uploadedFileService) {
        this.storageService = storageService;
        this.uploadedFileService = uploadedFileService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('BADGE_CATEGORY_CREATE','BADGE_CATEGORY_UPDATE')")
    public BadgeCategoryUploadResponse upload(@RequestParam("file") MultipartFile file) {
        StoredIcon stored = storageService.store(file);
        String url = storageService.publicUrlForKey(stored.key());
        recordUpload(stored, url);
        return new BadgeCategoryUploadResponse(url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
    }

    @GetMapping("/{key}")
    public ResponseEntity<Resource> get(@PathVariable String key, HttpServletResponse response) throws IOException {
        Resource resource = storageService.load(key);
        String contentType = resource.getURL().openConnection().getContentType();
        return ResponseEntity.ok()
                .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + resource.getFilename())
                .body(resource);
    }

    public record BadgeCategoryUploadResponse(String url, String originalFilename, String mimeType, long sizeBytes) {
    }

    private void recordUpload(StoredIcon stored, String url) {
        try {
            uploadedFileService.recordUpload(UploadedFileModule.BADGE_CATEGORY_ICON, stored.key(), url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
        } catch (Exception ex) {
            LOGGER.debug("Failed to record badge category icon upload: {}", ex.getMessage());
        }
    }
}
