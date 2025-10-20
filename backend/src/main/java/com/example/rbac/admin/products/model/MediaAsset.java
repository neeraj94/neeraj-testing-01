package com.example.rbac.admin.products.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class MediaAsset {

    @Column(name = "url", length = 500)
    private String url;

    @Column(name = "storage_key", length = 255)
    private String storageKey;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    @Column(name = "mime_type", length = 150)
    private String mimeType;

    @Column(name = "size_bytes")
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
