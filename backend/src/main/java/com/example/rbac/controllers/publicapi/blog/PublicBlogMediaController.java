package com.example.rbac.controllers.publicapi.blog;

import com.example.rbac.blog.service.BlogMediaStorageService;
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
@RequestMapping("/api/publicapi/blog/media")
public class PublicBlogMediaController {

    private final BlogMediaStorageService blogMediaStorageService;

    public PublicBlogMediaController(BlogMediaStorageService blogMediaStorageService) {
        this.blogMediaStorageService = blogMediaStorageService;
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
