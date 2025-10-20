package com.example.rbac.admin.uploadedfile.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class UploadedFileDeleteRequest {

    @NotEmpty
    private List<@NotNull Long> ids;

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }
}
