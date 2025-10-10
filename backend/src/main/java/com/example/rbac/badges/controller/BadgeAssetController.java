package com.example.rbac.badges.controller;

import com.example.rbac.badges.dto.BadgeIconUploadResponse;
import com.example.rbac.badges.service.BadgeIconStorageService;
import com.example.rbac.badges.service.BadgeIconStorageService.StoredIcon;
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
@RequestMapping("/api/v1/badges/assets")
public class BadgeAssetController {

    private final BadgeIconStorageService storageService;

    public BadgeAssetController(BadgeIconStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('BADGE_CREATE','BADGE_UPDATE')")
    public BadgeIconUploadResponse upload(@RequestParam("file") MultipartFile file) {
        StoredIcon stored = storageService.store(file);
        String url = storageService.publicUrlForKey(stored.key());
        return new BadgeIconUploadResponse(url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
    }

    @GetMapping("/{key}")
    public ResponseEntity<Resource> get(@PathVariable("key") String key, HttpServletResponse response) throws IOException {
        Resource resource = storageService.load(key);
        String contentType = resource.getURL().openConnection().getContentType();
        return ResponseEntity.ok()
                .contentType(contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + resource.getFilename())
                .body(resource);
    }
}
