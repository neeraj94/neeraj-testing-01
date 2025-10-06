package com.example.rbac.activity.dto;

import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public record ActivityLogFilter(
        String search,
        String user,
        List<String> roles,
        List<String> departments,
        List<String> modules,
        List<String> activityTypes,
        List<String> statuses,
        List<String> ipAddresses,
        List<String> devices,
        Instant startDate,
        Instant endDate
) {
    public ActivityLogFilter {
        search = normalizeText(search);
        user = normalizeText(user);
        roles = normalizeList(roles);
        departments = normalizeList(departments);
        modules = normalizeList(modules);
        activityTypes = normalizeList(activityTypes);
        statuses = normalizeList(statuses);
        ipAddresses = normalizeList(ipAddresses);
        devices = normalizeList(devices);
    }

    private static String normalizeText(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static List<String> normalizeList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return Collections.emptyList();
        }
        return values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.collectingAndThen(Collectors.toList(), List::copyOf));
    }
}
