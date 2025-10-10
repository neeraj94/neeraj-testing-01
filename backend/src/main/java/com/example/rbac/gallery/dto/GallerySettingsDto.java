package com.example.rbac.gallery.dto;

import java.util.List;

public class GallerySettingsDto {

    private List<String> allowedExtensions;
    private long maxFileSizeBytes;

    public GallerySettingsDto() {
    }

    public GallerySettingsDto(List<String> allowedExtensions, long maxFileSizeBytes) {
        this.allowedExtensions = allowedExtensions;
        this.maxFileSizeBytes = maxFileSizeBytes;
    }

    public List<String> getAllowedExtensions() {
        return allowedExtensions;
    }

    public void setAllowedExtensions(List<String> allowedExtensions) {
        this.allowedExtensions = allowedExtensions;
    }

    public long getMaxFileSizeBytes() {
        return maxFileSizeBytes;
    }

    public void setMaxFileSizeBytes(long maxFileSizeBytes) {
        this.maxFileSizeBytes = maxFileSizeBytes;
    }
}
