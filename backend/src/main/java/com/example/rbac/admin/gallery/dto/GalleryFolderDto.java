package com.example.rbac.admin.gallery.dto;

public class GalleryFolderDto {

    private Long id;
    private String name;
    private String path;
    private Long parentId;
    private boolean root;
    private Long ownerId;
    private String ownerName;
    private String ownerEmail;
    private String ownerKey;

    public GalleryFolderDto() {
    }

    public GalleryFolderDto(Long id,
                            String name,
                            String path,
                            Long parentId,
                            boolean root,
                            Long ownerId,
                            String ownerName,
                            String ownerEmail,
                            String ownerKey) {
        this.id = id;
        this.name = name;
        this.path = path;
        this.parentId = parentId;
        this.root = root;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.ownerEmail = ownerEmail;
        this.ownerKey = ownerKey;
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

    public Long getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(Long ownerId) {
        this.ownerId = ownerId;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public void setOwnerEmail(String ownerEmail) {
        this.ownerEmail = ownerEmail;
    }

    public String getOwnerKey() {
        return ownerKey;
    }

    public void setOwnerKey(String ownerKey) {
        this.ownerKey = ownerKey;
    }
}
