package com.example.rbac.admin.activity.controller;

import com.example.rbac.admin.activity.dto.ActivityFilterOptionsDto;
import com.example.rbac.admin.activity.dto.ActivityLogDetailDto;
import com.example.rbac.admin.activity.dto.ActivityLogDto;
import com.example.rbac.admin.activity.dto.ActivityLogFilter;
import com.example.rbac.admin.activity.service.ActivityLogService;
import com.example.rbac.common.pagination.PageResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/activity")
public class ActivityController {

    private final ActivityLogService activityLogService;

    public ActivityController(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @GetMapping
    public PageResponse<ActivityLogDto> search(@RequestParam(name = "page", defaultValue = "0") int page,
                                               @RequestParam(name = "size", defaultValue = "25") int size,
                                               @RequestParam(name = "sort", defaultValue = "timestamp") String sort,
                                               @RequestParam(name = "direction", defaultValue = "desc") String direction,
                                               @RequestParam(name = "search", required = false) String search,
                                               @RequestParam(name = "user", required = false) String user,
                                               @RequestParam(name = "role", required = false) List<String> roles,
                                               @RequestParam(name = "department", required = false) List<String> departments,
                                               @RequestParam(name = "module", required = false) List<String> modules,
                                               @RequestParam(name = "type", required = false) List<String> types,
                                               @RequestParam(name = "status", required = false) List<String> statuses,
                                               @RequestParam(name = "ipAddress", required = false) List<String> ipAddresses,
                                               @RequestParam(name = "device", required = false) List<String> devices,
                                               @RequestParam(name = "startDate", required = false)
                                               @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                               OffsetDateTime startDate,
                                               @RequestParam(name = "endDate", required = false)
                                               @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                               OffsetDateTime endDate) {
        ActivityLogFilter filter = new ActivityLogFilter(
                search,
                user,
                roles,
                departments,
                modules,
                types,
                statuses,
                ipAddresses,
                devices,
                startDate != null ? startDate.toInstant() : null,
                endDate != null ? endDate.toInstant() : null
        );
        return activityLogService.search(page, size, sort, direction, filter);
    }

    @GetMapping("/{id}")
    public ActivityLogDetailDto getDetail(@PathVariable("id") Long id) {
        return activityLogService.getDetail(id);
    }

    @GetMapping("/filters")
    public ActivityFilterOptionsDto getFilters() {
        return activityLogService.getFilterOptions();
    }
}
