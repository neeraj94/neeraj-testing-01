package com.example.rbac.controllers.publicapi.assets;

import com.example.rbac.badges.service.BadgeIconStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/badges/assets")
public class PublicBadgeAssetController {

    private final BadgeIconStorageService storageService;

    public PublicBadgeAssetController(BadgeIconStorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/{key}")
    public ResponseEntity<Resource> get(@PathVariable("key") String key) {
        Resource resource = storageService.load(key);
        String contentType;
        try {
            contentType = resource.getURL().openConnection().getContentType();
        } catch (Exception ex) {
            contentType = null;
        }
        MediaType mediaType = contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=" + resource.getFilename())
                .body(resource);
    }
}
