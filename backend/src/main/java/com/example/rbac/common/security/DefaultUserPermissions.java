package com.example.rbac.common.security;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

public final class DefaultUserPermissions {

    private static final Set<String> DEFAULT_PERMISSIONS;

    static {
        LinkedHashSet<String> defaults = new LinkedHashSet<>();
        defaults.add("CUSTOMER_CART_MANAGE");
        defaults.add("CUSTOMER_CHECKOUT");
        defaults.add("CUSTOMER_PROFILE_MANAGE");
        DEFAULT_PERMISSIONS = Collections.unmodifiableSet(defaults);
    }

    private DefaultUserPermissions() {
    }

    public static Set<String> getPermissions() {
        return DEFAULT_PERMISSIONS;
    }
}
