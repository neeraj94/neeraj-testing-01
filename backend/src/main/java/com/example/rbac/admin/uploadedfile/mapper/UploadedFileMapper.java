package com.example.rbac.admin.uploadedfile.mapper;

import com.example.rbac.admin.uploadedfile.dto.UploadedFileDto;
import com.example.rbac.admin.uploadedfile.model.UploadedFile;

public class UploadedFileMapper {

    private UploadedFileMapper() {
    }

    public static UploadedFileDto toDto(UploadedFile entity) {
        UploadedFileDto dto = new UploadedFileDto();
        dto.setId(entity.getId());
        if (entity.getModule() != null) {
            dto.setModule(entity.getModule().name());
            dto.setFeatureName(entity.getModule().getFeatureName());
            dto.setContextLabel(entity.getModule().getContextLabel());
        } else {
            dto.setModule(null);
            dto.setFeatureName(entity.getFeatureName());
            dto.setContextLabel(entity.getContextLabel());
        }
        dto.setStorageKey(entity.getStorageKey());
        dto.setPublicUrl(entity.getPublicUrl());
        dto.setOriginalFilename(entity.getOriginalFilename());
        dto.setMimeType(entity.getMimeType());
        dto.setFileType(entity.getFileType());
        dto.setSizeBytes(entity.getSizeBytes());
        dto.setUploadedById(entity.getUploadedById());
        dto.setUploadedByName(entity.getUploadedByName());
        dto.setUploadedAt(entity.getUploadedAt());
        return dto;
    }
}
