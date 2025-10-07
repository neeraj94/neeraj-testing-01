package com.example.rbac.gallery.dto;

public class GalleryFolderDto {

    private Long id;
    private String name;
    private String path;
    private Long parentId;
    private boolean root;

    public GalleryFolderDto() {
    }

    public GalleryFolderDto(Long id, String name, String path, Long parentId, boolean root) {
        this.id = id;
        this.name = name;
        this.path = path;
        this.parentId = parentId;
        this.root = root;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public boolean isRoot() {
        return root;
    }

    public void setRoot(boolean root) {
        this.root = root;
    }
}
