package com.example.rbac.common.security;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * Central registry for default permission sets that should be automatically
 * assigned to specific role keys when they are provisioned.
 */
public final class DefaultUserPermissions {

    private static final String CUSTOMER_ROLE_KEY = "CUSTOMER";

    private static final Set<String> CUSTOMER_PERMISSIONS;

    private static final Map<String, Set<String>> ROLE_DEFAULTS;

    static {
        LinkedHashSet<String> customerDefaults = new LinkedHashSet<>();
        customerDefaults.add("CUSTOMER_VIEW_PROFILE");
        customerDefaults.add("CUSTOMER_MANAGE_PROFILE");
        customerDefaults.add("CUSTOMER_MANAGE_ADDRESSES");
        customerDefaults.add("CUSTOMER_MANAGE_CART");
        customerDefaults.add("CUSTOMER_MANAGE_CHECKOUT");
        customerDefaults.add("CUSTOMER_PLACE_ORDER");
        customerDefaults.add("CUSTOMER_VIEW_ORDER_HISTORY");
        customerDefaults.add("CUSTOMER_VIEW_RECENTLY_VIEWED_PRODUCTS");
        CUSTOMER_PERMISSIONS = Collections.unmodifiableSet(customerDefaults);

        LinkedHashMap<String, Set<String>> roleDefaults = new LinkedHashMap<>();
        roleDefaults.put(CUSTOMER_ROLE_KEY, CUSTOMER_PERMISSIONS);
        ROLE_DEFAULTS = Collections.unmodifiableMap(roleDefaults);
    }

    private DefaultUserPermissions() {
    }

    public static Set<String> getCustomerPermissions() {
        return CUSTOMER_PERMISSIONS;
    }

    public static Set<String> getPermissionsForRole(String roleKey) {
        if (roleKey == null) {
            return Set.of();
        }
        return ROLE_DEFAULTS.entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(roleKey))
                .findFirst()
                .map(Map.Entry::getValue)
                .orElse(Set.of());
    }
}
