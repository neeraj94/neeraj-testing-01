package com.example.rbac.admin.attributes.dto;

import java.time.Instant;
import java.util.List;

public class AttributeDto {

    private Long id;
    private String name;
    private String slug;
    private List<AttributeValueDto> values;
    private Instant createdAt;
    private Instant updatedAt;

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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public List<AttributeValueDto> getValues() {
        return values;
    }

    public void setValues(List<AttributeValueDto> values) {
        this.values = values;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
