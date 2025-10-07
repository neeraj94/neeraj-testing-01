package com.example.rbac.setup.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class MenuLayoutResponse {

    private List<MenuNodeDto> layout = new ArrayList<>();
    private List<MenuNodeDto> defaults = new ArrayList<>();
    private Instant updatedAt;
    private String updatedBy;

    public List<MenuNodeDto> getLayout() {
        return layout;
    }

    public void setLayout(List<MenuNodeDto> layout) {
        this.layout = layout;
    }

    public List<MenuNodeDto> getDefaults() {
        return defaults;
    }

    public void setDefaults(List<MenuNodeDto> defaults) {
        this.defaults = defaults;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
}
