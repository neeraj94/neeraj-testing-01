package com.example.rbac.admin.gallery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class GalleryFolderRenameRequest {

    @NotBlank
    @Size(max = 150)
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
