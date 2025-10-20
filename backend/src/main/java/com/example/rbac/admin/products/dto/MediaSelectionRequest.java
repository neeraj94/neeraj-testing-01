package com.example.rbac.admin.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MediaSelectionRequest {

    @NotBlank(message = "Media URL is required")
    @Size(max = 500, message = "Media URL must be at most 500 characters")
    private String url;

    @Size(max = 255, message = "Storage key must be at most 255 characters")
    private String storageKey;

    @Size(max = 255, message = "Filename must be at most 255 characters")
    private String originalFilename;

    @Size(max = 150, message = "MIME type must be at most 150 characters")
    private String mimeType;

    private Long sizeBytes;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public void setStorageKey(String storageKey) {
        this.storageKey = storageKey;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(Long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }
}
