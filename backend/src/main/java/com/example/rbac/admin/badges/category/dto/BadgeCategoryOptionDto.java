package com.example.rbac.admin.badges.category.dto;

public class BadgeCategoryOptionDto {

    private Long id;
    private String title;

    public BadgeCategoryOptionDto() {
    }

    public BadgeCategoryOptionDto(Long id, String title) {
        this.id = id;
        this.title = title;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
