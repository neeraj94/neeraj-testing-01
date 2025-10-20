package com.example.rbac.admin.products.controller;

import com.example.rbac.common.exception.ApiException;
import com.example.rbac.products.dto.ProductAssetUploadResponse;
import com.example.rbac.products.service.ProductAssetStorageService;
import com.example.rbac.products.service.ProductAssetStorageService.AssetType;
import com.example.rbac.products.service.ProductAssetStorageService.StoredAsset;
import com.example.rbac.uploadedfile.service.UploadedFileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/products/assets")
public class ProductAssetController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProductAssetController.class);

    private final ProductAssetStorageService storageService;
    private final UploadedFileService uploadedFileService;

    public ProductAssetController(ProductAssetStorageService storageService, UploadedFileService uploadedFileService) {
        this.storageService = storageService;
        this.uploadedFileService = uploadedFileService;
    }

    @PostMapping("/{type}")
    @PreAuthorize("hasAnyAuthority('PRODUCT_CREATE','PRODUCT_UPDATE')")
    public List<ProductAssetUploadResponse> upload(
            @PathVariable("type") String rawType,
            @RequestParam("files") List<MultipartFile> files
    ) {
        AssetType type = AssetType.fromPathSegment(rawType);
        if (CollectionUtils.isEmpty(files)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Select at least one file to upload");
        }
        List<StoredAsset> storedAssets = storageService.storeAll(files, type);
        List<ProductAssetUploadResponse> responses = new ArrayList<>();
        for (StoredAsset stored : storedAssets) {
            String url = storageService.publicUrlForKey(type, stored.key());
            recordUpload(stored, url);
            responses.add(new ProductAssetUploadResponse(url, stored.key(), stored.originalFilename(), stored.mimeType(), stored.sizeBytes()));
        }
        return responses;
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

    private void recordUpload(StoredAsset stored, String url) {
        try {
            uploadedFileService.recordUpload(
                    stored.module(),
                    stored.key(),
                    url,
                    stored.originalFilename(),
                    stored.mimeType(),
                    stored.sizeBytes()
            );
        } catch (Exception ex) {
            LOGGER.debug("Failed to record uploaded file for module {}: {}", stored.module(), ex.getMessage());
        }
    }
}
