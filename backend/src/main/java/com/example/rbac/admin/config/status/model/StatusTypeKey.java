package com.example.rbac.admin.config.status.model;

public enum StatusTypeKey {
    ORDER,
    PAYMENT;

    public static StatusTypeKey fromString(String value) {
        if (value == null) {
            throw new IllegalArgumentException("Status type is required");
        }
        try {
            return StatusTypeKey.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Unsupported status type: " + value);
        }
    }
}
