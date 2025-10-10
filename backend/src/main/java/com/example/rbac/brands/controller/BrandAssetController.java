package com.example.rbac.brands.controller;

import com.example.rbac.brands.dto.BrandLogoUploadResponse;
import com.example.rbac.brands.service.BrandLogoStorageService;
import com.example.rbac.brands.service.BrandLogoStorageService.StoredLogo;
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
@RequestMapping("/api/v1/brands/assets")
public class BrandAssetController {

    private final BrandLogoStorageService storageService;

    public BrandAssetController(BrandLogoStorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('BRAND_CREATE','BRAND_UPDATE')")
    public BrandLogoUploadResponse uploadLogo(@RequestParam("file") MultipartFile file) {
        StoredLogo stored = storageService.store(file);
        String url = "/api/v1/brands/assets/" + stored.key();
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
}
