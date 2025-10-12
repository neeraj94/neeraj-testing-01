package com.example.rbac.brands.dto;

public class BrandLogoUploadResponse {

    private final String url;
    private final String originalFilename;
    private final String mimeType;
    private final long sizeBytes;

    public BrandLogoUploadResponse(String url, String originalFilename, String mimeType, long sizeBytes) {
        this.url = url;
        this.originalFilename = originalFilename;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
    }

    public String getUrl() {
        return url;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }
}
