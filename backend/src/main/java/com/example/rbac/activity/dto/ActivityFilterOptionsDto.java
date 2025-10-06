package com.example.rbac.activity.dto;

import java.util.List;

public record ActivityFilterOptionsDto(
        List<String> activityTypes,
        List<String> modules,
        List<String> statuses,
        List<String> roles,
        List<String> departments,
        List<String> ipAddresses,
        List<String> devices
) {
}
