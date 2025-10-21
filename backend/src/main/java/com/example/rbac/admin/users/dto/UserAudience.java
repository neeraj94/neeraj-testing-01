package com.example.rbac.admin.users.dto;

import java.util.Locale;

public enum UserAudience {
    ALL,
    STAFF,
    CUSTOMERS;

    public static UserAudience fromValue(String value) {
        if (value == null || value.isBlank()) {
            return ALL;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "INTERNAL", "STAFF", "TEAM" -> STAFF;
            case "CUSTOMER", "CUSTOMERS", "CLIENT" -> CUSTOMERS;
            default -> ALL;
        };
    }
}
