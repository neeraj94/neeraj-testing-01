package com.example.rbac.products.dto.storefront;

import java.util.Locale;

public enum PublicProductSort {
    NEWEST("newest"),
    PRICE_ASC("price_asc"),
    PRICE_DESC("price_desc"),
    HIGHEST_RATED("highest_rated"),
    MOST_POPULAR("most_popular");

    private final String key;

    PublicProductSort(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }

    public static PublicProductSort fromKey(String value) {
        if (value == null || value.isBlank()) {
            return NEWEST;
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        for (PublicProductSort option : values()) {
            if (option.key.equals(normalized)) {
                return option;
            }
        }
        return NEWEST;
    }
}
