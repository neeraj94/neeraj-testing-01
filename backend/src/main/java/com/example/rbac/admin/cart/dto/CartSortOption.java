package com.example.rbac.admin.cart.dto;

public enum CartSortOption {
    NEWEST,
    OLDEST,
    HIGHEST_AMOUNT,
    LOWEST_AMOUNT;

    public static CartSortOption fromString(String value) {
        if (value == null || value.isBlank()) {
            return NEWEST;
        }
        try {
            return CartSortOption.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return NEWEST;
        }
    }
}
