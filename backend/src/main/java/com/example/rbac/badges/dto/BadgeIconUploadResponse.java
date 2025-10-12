package com.example.rbac.badges.dto;

public class BadgeIconUploadResponse {

    private String url;
    private String originalFilename;
    private String mimeType;
    private long sizeBytes;

    public BadgeIconUploadResponse() {
    }

    public BadgeIconUploadResponse(String url, String originalFilename, String mimeType, long sizeBytes) {
        this.url = url;
        this.originalFilename = originalFilename;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
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

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }
}
