package com.example.rbac.admin.blog.controller;

import com.example.rbac.admin.blog.dto.BlogMediaUploadResponse;
import com.example.rbac.admin.blog.service.BlogMediaStorageService;
import com.example.rbac.admin.blog.service.BlogMediaStorageService.StoredMedia;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.admin.uploadedfile.model.UploadedFileModule;
import com.example.rbac.admin.uploadedfile.service.UploadedFileService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Locale;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/blog/media")
public class BlogMediaController {

    private static final Logger LOGGER = LoggerFactory.getLogger(BlogMediaController.class);

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp",
            MediaType.IMAGE_GIF_VALUE,
            "image/svg+xml"
    );

    private final BlogMediaStorageService blogMediaStorageService;
    private final UploadedFileService uploadedFileService;

    public BlogMediaController(BlogMediaStorageService blogMediaStorageService,
                              UploadedFileService uploadedFileService) {
        this.blogMediaStorageService = blogMediaStorageService;
        this.uploadedFileService = uploadedFileService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('BLOG_POST_CREATE','BLOG_POST_UPDATE')")
    public BlogMediaUploadResponse upload(@RequestParam("file") MultipartFile file,
                                          @RequestParam(name = "usage", required = false) String usage) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported media type");
        }
        StoredMedia stored = blogMediaStorageService.store(file);
        String url = blogMediaStorageService.publicUrlForKey(stored.key());
        recordUpload(resolveModule(usage), stored, url);
        return new BlogMediaUploadResponse(stored.key(), url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
    }

    @GetMapping("/{key:.+}")
    public ResponseEntity<Resource> load(@PathVariable("key") String key) throws IOException {
        Resource resource = blogMediaStorageService.load(key);
        String contentType = Files.probeContentType(resource.getFile().toPath());
        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(resource);
    }

    private UploadedFileModule resolveModule(String usage) {
        if (usage == null || usage.isBlank()) {
            return UploadedFileModule.BLOG_BANNER_IMAGE;
        }
        String normalized = usage.trim().toUpperCase(Locale.ROOT);
        if (normalized.equals("META")) {
            return UploadedFileModule.BLOG_META_IMAGE;
        }
        return UploadedFileModule.BLOG_BANNER_IMAGE;
    }

    private void recordUpload(UploadedFileModule module, StoredMedia stored, String url) {
        try {
            uploadedFileService.recordUpload(module, stored.key(), url, stored.originalFilename(), stored.mimeType(), stored.sizeBytes());
        } catch (Exception ex) {
            LOGGER.debug("Failed to record uploaded file for module {}: {}", module, ex.getMessage());
        }
    }
}
