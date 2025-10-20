package com.example.rbac.admin.products.dto.publicview;

import java.util.List;

public class PublicProductSectionDto {

    private String title;
    private String content;
    private List<String> bulletPoints;

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
