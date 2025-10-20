package com.example.rbac.admin.products.dto;

import jakarta.validation.constraints.Size;

public class ProductExpandableSectionRequest {

    @Size(max = 200, message = "Section title must be at most 200 characters")
    private String title;

    private String content;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
