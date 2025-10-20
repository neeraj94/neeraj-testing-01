package com.example.rbac.admin.activity.spec;

import com.example.rbac.admin.activity.model.ActivityLog;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

public final class ActivityLogSpecifications {

    private ActivityLogSpecifications() {
    }

    public static Specification<ActivityLog> searchTerm(String term) {
        if (!StringUtils.hasText(term)) {
            return null;
        }
        final String pattern = "%" + term.trim().toLowerCase() + "%";
        return (root, query, builder) -> builder.or(
                builder.like(builder.lower(root.get("description")), pattern),
                builder.like(builder.lower(root.get("moduleName")), pattern),
                builder.like(builder.lower(root.get("activityType")), pattern),
                builder.like(builder.lower(root.get("userName")), pattern),
                builder.like(builder.lower(root.get("ipAddress")), pattern),
                builder.like(builder.lower(root.get("device")), pattern)
        );
    }

    public static Specification<ActivityLog> userQuery(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        final String trimmed = value.trim();
        final String pattern = "%" + trimmed.toLowerCase() + "%";
        final boolean numeric = trimmed.chars().allMatch(Character::isDigit);
        return (root, query, builder) -> {
            if (numeric) {
                Long userId;
                try {
                    userId = Long.parseLong(trimmed);
                } catch (NumberFormatException ex) {
                    userId = null;
                }
                if (userId != null) {
                    return builder.or(
                            builder.equal(root.get("userId"), userId),
                            builder.like(builder.lower(root.get("userName")), pattern)
                    );
                }
            }
            return builder.like(builder.lower(root.get("userName")), pattern);
        };
    }

    public static Specification<ActivityLog> roles(Collection<String> roles) {
        List<String> normalized = normalizeUpperList(roles);
        if (normalized.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> builder.upper(root.get("userRole")).in(normalized);
    }

    public static Specification<ActivityLog> departments(Collection<String> departments) {
        List<String> normalized = normalizeUpperList(departments);
        if (normalized.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> builder.upper(root.get("department")).in(normalized);
    }

    public static Specification<ActivityLog> modules(Collection<String> modules) {
        List<String> normalized = normalizeUpperList(modules);
        if (normalized.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> builder.upper(root.get("moduleName")).in(normalized);
    }

    public static Specification<ActivityLog> activityTypes(Collection<String> types) {
        List<String> normalized = normalizeUpperList(types);
        if (normalized.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> builder.upper(root.get("activityType")).in(normalized);
    }

    public static Specification<ActivityLog> statuses(Collection<String> statuses) {
        List<String> normalized = normalizeUpperList(statuses);
        if (normalized.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> builder.upper(root.get("status")).in(normalized);
    }

    public static Specification<ActivityLog> ipAddresses(Collection<String> ipAddresses) {
        List<String> normalized = normalizeList(ipAddresses);
        if (normalized.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> root.get("ipAddress").in(normalized);
    }

    public static Specification<ActivityLog> devices(Collection<String> devices) {
        List<String> normalized = normalizeUpperList(devices);
        if (normalized.isEmpty()) {
            return null;
        }
        return (root, query, builder) -> builder.upper(root.get("device")).in(normalized);
    }

    public static Specification<ActivityLog> occurredAfter(Instant start) {
        if (start == null) {
            return null;
        }
        return (root, query, builder) -> builder.greaterThanOrEqualTo(root.get("occurredAt"), start);
    }

    public static Specification<ActivityLog> occurredBefore(Instant end) {
        if (end == null) {
            return null;
        }
        return (root, query, builder) -> builder.lessThanOrEqualTo(root.get("occurredAt"), end);
    }

    private static List<String> normalizeUpperList(Collection<String> values) {
        return normalizeList(values).stream()
                .map(value -> value.toUpperCase())
                .collect(Collectors.toList());
    }

    private static List<String> normalizeList(Collection<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toList());
    }
}
