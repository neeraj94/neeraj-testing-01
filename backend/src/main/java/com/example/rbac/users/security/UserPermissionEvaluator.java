package com.example.rbac.users.security;

import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.Optional;

@Component
public class UserPermissionEvaluator {

    private static final String VIEW_GLOBAL = "USER_VIEW_GLOBAL";
    private static final String VIEW_SELF = "USER_VIEW";
    private static final String VIEW_OWN = "USER_VIEW_OWN";
    private static final String CREATE = "USER_CREATE";
    private static final String UPDATE = "USER_UPDATE";
    private static final String DELETE = "USER_DELETE";

    public boolean canViewUser(Long userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (hasAuthority(authentication, VIEW_GLOBAL)) {
            return true;
        }
        if (userId == null) {
            return false;
        }
        if (hasAuthority(authentication, VIEW_SELF) || hasAuthority(authentication, VIEW_OWN)) {
            return resolveCurrentUserId(authentication)
                    .map(currentUserId -> Objects.equals(currentUserId, userId))
                    .orElse(false);
        }
        return false;
    }

    public boolean canCreateUserRecords(Long userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!hasAuthority(authentication, CREATE)) {
            return false;
        }
        if (hasAuthority(authentication, VIEW_GLOBAL)) {
            return true;
        }
        return canViewUser(userId);
    }

    public boolean canUpdateUserRecords(Long userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!hasAuthority(authentication, UPDATE)) {
            return false;
        }
        if (hasAuthority(authentication, VIEW_GLOBAL)) {
            return true;
        }
        return canViewUser(userId);
    }

    public boolean canDeleteUserRecords(Long userId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!hasAuthority(authentication, DELETE)) {
            return false;
        }
        if (hasAuthority(authentication, VIEW_GLOBAL)) {
            return true;
        }
        return canViewUser(userId);
    }

    public boolean canViewRecentActivity(Long userId) {
        return canViewUser(userId);
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
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

    private Optional<Long> resolveCurrentUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal userPrincipal)) {
            return Optional.empty();
        }
        User user = userPrincipal.getUser();
        if (user == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(user.getId());
    }
}

