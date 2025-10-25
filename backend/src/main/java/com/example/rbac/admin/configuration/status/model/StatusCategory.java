package com.example.rbac.admin.configuration.status.model;

public enum StatusCategory {
    ORDER("Order Status");

    private final String displayName;

    StatusCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static StatusCategory fromValue(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        for (StatusCategory category : values()) {
            if (category.name().equalsIgnoreCase(normalized)) {
                return category;
            }
        }
        throw new IllegalArgumentException("Unknown status category: " + value);
    }
}
