package com.example.rbac.admin.products.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class ProductInfoSectionRequest {

    @NotBlank(message = "Section title is required")
    @Size(max = 200, message = "Section title must be at most 200 characters")
    private String title;

    private String content;

    private List<@NotBlank(message = "Bullet point cannot be blank") @Size(max = 500, message = "Bullet point must be at most 500 characters") String> bulletPoints = new ArrayList<>();

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

    public List<String> getBulletPoints() {
        return bulletPoints;
    }

    public void setBulletPoints(List<String> bulletPoints) {
        this.bulletPoints = bulletPoints;
    }
}
