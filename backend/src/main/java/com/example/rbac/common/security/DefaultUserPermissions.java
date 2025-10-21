package com.example.rbac.common.security;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public final class DefaultUserPermissions {

    private static final Set<String> DEFAULT_PERMISSIONS;

    static {
        LinkedHashSet<String> defaults = new LinkedHashSet<>();
        defaults.add("CUSTOMER_VIEW_PROFILE");
        defaults.add("CUSTOMER_MANAGE_PROFILE");
        defaults.add("CUSTOMER_MANAGE_ADDRESSES");
        defaults.add("CUSTOMER_MANAGE_CART");
        defaults.add("CUSTOMER_MANAGE_CHECKOUT");
        defaults.add("CUSTOMER_PLACE_ORDER");
        defaults.add("CUSTOMER_VIEW_ORDER_HISTORY");
        defaults.add("CUSTOMER_VIEW_RECENTLY_VIEWED_PRODUCTS");
        DEFAULT_PERMISSIONS = Collections.unmodifiableSet(defaults);
    }

    private DefaultUserPermissions() {
    }

    public static Set<String> getPermissions() {
        return DEFAULT_PERMISSIONS;
    }
}
