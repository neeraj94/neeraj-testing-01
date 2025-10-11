package com.example.rbac.badges.category.controller;

import com.example.rbac.badges.category.service.BadgeCategoryIconStorageService;
import com.example.rbac.badges.category.service.BadgeCategoryIconStorageService.StoredIcon;
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
@RequestMapping("/api/v1/badge-categories/assets")
public class BadgeCategoryAssetController {

    private final BadgeCategoryIconStorageService storageService;

    public BadgeCategoryAssetController(BadgeCategoryIconStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('BADGE_CATEGORY_CREATE','BADGE_CATEGORY_UPDATE')")
    public BadgeCategoryUploadResponse upload(@RequestParam("file") MultipartFile file) {
        StoredIcon stored = storageService.store(file);
        String url = storageService.publicUrlForKey(stored.key());
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
}
