package com.example.rbac.controllers.public.assets;

import com.example.rbac.products.service.ProductAssetStorageService;
import com.example.rbac.products.service.ProductAssetStorageService.AssetType;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/public/products/assets")
public class PublicProductAssetController {

    private final ProductAssetStorageService storageService;

    public PublicProductAssetController(ProductAssetStorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/{type}/{key:.+}")
    public ResponseEntity<Resource> serve(@PathVariable("type") String rawType, @PathVariable("key") String key) {
        AssetType type = AssetType.fromPathSegment(rawType);
        Resource resource = storageService.load(type, key);
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
