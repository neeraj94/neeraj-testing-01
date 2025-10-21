package com.example.rbac.common.media;

import com.example.rbac.admin.badges.category.service.BadgeCategoryIconStorageService;
import com.example.rbac.admin.badges.service.BadgeIconStorageService;
import com.example.rbac.admin.blog.service.BlogMediaStorageService;
import com.example.rbac.admin.brands.service.BrandLogoStorageService;
import com.example.rbac.admin.categories.service.CategoryAssetStorageService;
import com.example.rbac.admin.categories.service.CategoryAssetStorageService.AssetType;
import com.example.rbac.admin.products.service.ProductAssetStorageService;
import com.example.rbac.admin.uploadedfile.service.UploadedFileStorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Exposes read-only media asset endpoints that are shared between the
 * storefront, client portal, and admin dashboard. These mirror the admin
 * upload controllers but live outside the admin package so they are not
 * subject to the {@code /api/v1/admin} prefix and can be consumed without
 * elevated permissions.
 */
@RestController
public class PublicAssetController {

    private final BrandLogoStorageService brandLogoStorageService;
    private final CategoryAssetStorageService categoryAssetStorageService;
    private final BadgeCategoryIconStorageService badgeCategoryIconStorageService;
    private final BadgeIconStorageService badgeIconStorageService;
    private final ProductAssetStorageService productAssetStorageService;
    private final UploadedFileStorageService uploadedFileStorageService;
    private final BlogMediaStorageService blogMediaStorageService;

    public PublicAssetController(BrandLogoStorageService brandLogoStorageService,
                                 CategoryAssetStorageService categoryAssetStorageService,
                                 BadgeCategoryIconStorageService badgeCategoryIconStorageService,
                                 BadgeIconStorageService badgeIconStorageService,
                                 ProductAssetStorageService productAssetStorageService,
                                 UploadedFileStorageService uploadedFileStorageService,
                                 BlogMediaStorageService blogMediaStorageService) {
        this.brandLogoStorageService = brandLogoStorageService;
        this.categoryAssetStorageService = categoryAssetStorageService;
        this.badgeCategoryIconStorageService = badgeCategoryIconStorageService;
        this.badgeIconStorageService = badgeIconStorageService;
        this.productAssetStorageService = productAssetStorageService;
        this.uploadedFileStorageService = uploadedFileStorageService;
        this.blogMediaStorageService = blogMediaStorageService;
    }

    @GetMapping({
            "/api/v1/brands/assets/{key:.+}",
            "/api/v1/client/brands/assets/{key:.+}"
    })
    public ResponseEntity<Resource> serveBrandLogo(@PathVariable("key") String key) {
        Resource resource = brandLogoStorageService.load(key);
        return buildInlineResponse(resource, key);
    }

    @GetMapping({
            "/api/v1/categories/assets/{type}/{key:.+}",
            "/api/v1/client/categories/assets/{type}/{key:.+}"
    })
    public ResponseEntity<Resource> serveCategoryAsset(@PathVariable("type") String type,
                                                       @PathVariable("key") String key) {
        AssetType assetType = AssetType.fromPathSegment(type);
        Resource resource = categoryAssetStorageService.load(assetType, key);
        return buildInlineResponse(resource, key);
    }

    @GetMapping({
            "/api/v1/badge-categories/assets/{key:.+}",
            "/api/v1/client/badge-categories/assets/{key:.+}"
    })
    public ResponseEntity<Resource> serveBadgeCategoryIcon(@PathVariable("key") String key) {
        Resource resource = badgeCategoryIconStorageService.load(key);
        return buildInlineResponse(resource, key);
    }

    @GetMapping({
            "/api/v1/badges/assets/{key:.+}",
            "/api/v1/client/badges/assets/{key:.+}"
    })
    public ResponseEntity<Resource> serveBadgeIcon(@PathVariable("key") String key) {
        Resource resource = badgeIconStorageService.load(key);
        return buildInlineResponse(resource, key);
    }

    @GetMapping({
            "/api/v1/products/assets/{type}/{key:.+}",
            "/api/v1/client/products/assets/{type}/{key:.+}"
    })
    public ResponseEntity<Resource> serveProductAsset(@PathVariable("type") String type,
                                                      @PathVariable("key") String key) {
        ProductAssetStorageService.AssetType assetType = ProductAssetStorageService.AssetType.fromPathSegment(type);
        Resource resource = productAssetStorageService.load(assetType, key);
        return buildInlineResponse(resource, key);
    }

    @GetMapping({
            "/api/v1/uploaded-files/assets/{key:.+}",
            "/api/v1/client/uploaded-files/assets/{key:.+}"
    })
    public ResponseEntity<Resource> serveUploadedFile(@PathVariable("key") String key) {
        Resource resource = uploadedFileStorageService.loadAsResource(key);
        return buildInlineResponse(resource, key);
    }

    @GetMapping({
            "/api/v1/blog/media/{key:.+}",
            "/api/v1/client/blog/media/{key:.+}"
    })
    public ResponseEntity<Resource> serveBlogMedia(@PathVariable("key") String key) {
        Resource resource = blogMediaStorageService.load(key);
        return buildInlineResponse(resource, key);
    }

    private ResponseEntity<Resource> buildInlineResponse(Resource resource, String fallbackName) {
        String filename = resource.getFilename();
        if (!StringUtils.hasText(filename)) {
            filename = fallbackName;
        }
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8)
                .replace("+", "%20");

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        try {
            String contentType = resource.getURL().openConnection().getContentType();
            if (contentType != null) {
                mediaType = MediaType.parseMediaType(contentType);
            }
        } catch (IOException ignored) {
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + encoded + "\"")
                .body(resource);
    }
}

