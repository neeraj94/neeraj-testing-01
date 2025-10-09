package com.example.rbac.blog.controller;

import com.example.rbac.blog.dto.BlogMediaUploadResponse;
import com.example.rbac.blog.service.BlogMediaStorageService;
import com.example.rbac.common.exception.ApiException;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/blog/media")
public class BlogMediaController {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp",
            MediaType.IMAGE_GIF_VALUE,
            "image/svg+xml"
    );

    private final BlogMediaStorageService blogMediaStorageService;

    public BlogMediaController(BlogMediaStorageService blogMediaStorageService) {
        this.blogMediaStorageService = blogMediaStorageService;
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('BLOG_POST_CREATE','BLOG_POST_UPDATE')")
    public BlogMediaUploadResponse upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unsupported media type");
        }
        String key = blogMediaStorageService.store(file);
        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/blog/media/")
                .path(key)
                .toUriString();
        return new BlogMediaUploadResponse(key, url);
    }

    @GetMapping("/{key}")
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
}
