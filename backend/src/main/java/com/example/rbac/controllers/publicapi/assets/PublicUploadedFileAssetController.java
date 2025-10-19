package com.example.rbac.controllers.publicapi.assets;

import com.example.rbac.uploadedfile.service.UploadedFileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;

@RestController
@RequestMapping("/api/publicapi/uploaded-files/assets")
public class PublicUploadedFileAssetController {

    private final UploadedFileStorageService storageService;

    public PublicUploadedFileAssetController(UploadedFileStorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/{key:.+}")
    public ResponseEntity<Resource> serve(@PathVariable("key") String key) throws IOException {
        Resource resource = storageService.loadAsResource(key);
        String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        try {
            String detected = Files.probeContentType(resource.getFile().toPath());
            if (detected != null) {
                contentType = detected;
            }
        } catch (IOException ignored) {
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(resource);
    }
}
