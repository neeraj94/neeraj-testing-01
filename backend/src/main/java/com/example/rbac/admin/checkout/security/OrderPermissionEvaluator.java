package com.example.rbac.admin.checkout.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class OrderPermissionEvaluator {

    private static final String VIEW_GLOBAL = "ORDER_VIEW_GLOBAL";
    private static final String CREATE = "ORDER_CREATE";
    private static final String UPDATE = "ORDER_UPDATE";
    private static final String DELETE = "ORDER_DELETE";

    public boolean canViewOrders() {
        return hasAuthority(VIEW_GLOBAL);
    }

    public boolean canViewOrdersForUser(Long userId) {
        return canViewOrders();
    }

    public boolean canCreateOrders() {
        return hasAuthority(CREATE);
    }

    public boolean canUpdateOrders() {
        return hasAuthority(UPDATE);
    }

    public boolean canDeleteOrders() {
        return hasAuthority(DELETE);
    }

    private boolean hasAuthority(String authority) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authority == null) {
            return false;
        }
        for (GrantedAuthority grantedAuthority : authentication.getAuthorities()) {
            if (authority.equals(grantedAuthority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
