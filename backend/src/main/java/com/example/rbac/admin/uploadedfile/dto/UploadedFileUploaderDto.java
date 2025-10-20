package com.example.rbac.admin.uploadedfile.dto;

public class UploadedFileUploaderDto {

    private Long id;
    private String name;

    public UploadedFileUploaderDto() {
    }

    public UploadedFileUploaderDto(Long id, String name) {
        this.id = id;
        this.name = name;
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
}
