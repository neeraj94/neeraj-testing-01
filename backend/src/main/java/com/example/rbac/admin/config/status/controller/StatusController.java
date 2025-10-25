package com.example.rbac.admin.config.status.controller;

import com.example.rbac.admin.config.status.dto.*;
import com.example.rbac.admin.config.status.model.StatusTypeKey;
import com.example.rbac.admin.config.status.service.StatusService;
import com.example.rbac.common.pagination.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

@RestController
@RequestMapping("/config/statuses")
public class StatusController {

    private final StatusService statusService;

    public StatusController(StatusService statusService) {
        this.statusService = statusService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.VIEW','CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.VIEW','CONFIG.PAYMENT_STATUS.MANAGE')")
    public PageResponse<StatusSummaryDto> list(@RequestParam(name = "type") String type,
                                               @RequestParam(name = "search", required = false) String search,
                                               @RequestParam(name = "page", defaultValue = "0") int page,
                                               @RequestParam(name = "size", defaultValue = "20") int size) {
        ensurePermission(type, false);
        return statusService.list(type, page, size, search);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.VIEW','CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.VIEW','CONFIG.PAYMENT_STATUS.MANAGE')")
    public StatusDetailDto get(@PathVariable("id") Long id,
                               @RequestParam(name = "type", required = false) String type) {
        StatusDetailDto detail = statusService.get(id);
        ensurePermission(type != null ? type : detail.type(), false);
        return detail;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.MANAGE')")
    public StatusDetailDto create(@Valid @RequestBody StatusRequest request) {
        ensurePermission(request != null ? request.getType() : null, true);
        return statusService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.MANAGE')")
    public StatusDetailDto update(@PathVariable("id") Long id, @Valid @RequestBody StatusRequest request) {
        StatusDetailDto existing = statusService.get(id);
        String typeForCheck = request != null && StringUtils.hasText(request.getType())
                ? request.getType()
                : existing.type();
        ensurePermission(typeForCheck, true);
        return statusService.update(id, request);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.MANAGE')")
    public StatusDetailDto patch(@PathVariable("id") Long id, @RequestBody StatusPatchRequest request) {
        StatusDetailDto existing = statusService.get(id);
        ensurePermission(existing.type(), true);
        return statusService.patch(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.MANAGE')")
    public void delete(@PathVariable("id") Long id, @RequestParam(name = "type", required = false) String type) {
        StatusDetailDto existing = statusService.get(id);
        ensurePermission(type != null ? type : existing.type(), true);
        statusService.delete(id);
    }

    @PostMapping("/reorder")
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.MANAGE')")
    public void reorder(@Valid @RequestBody StatusReorderRequest request) {
        ensurePermission(request != null ? request.getType() : null, true);
        statusService.reorder(request);
    }

    @GetMapping("/{id}/transitions")
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.VIEW','CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.VIEW','CONFIG.PAYMENT_STATUS.MANAGE')")
    public java.util.List<Long> getTransitions(@PathVariable("id") Long id,
                                               @RequestParam(name = "type", required = false) String type) {
        StatusDetailDto detail = statusService.get(id);
        ensurePermission(type != null ? type : detail.type(), false);
        return detail.allowedTransitionIds();
    }

    @PutMapping("/{id}/transitions")
    @PreAuthorize("hasAnyAuthority('CONFIG.ORDER_STATUS.MANAGE','CONFIG.PAYMENT_STATUS.MANAGE')")
    public java.util.List<Long> updateTransitions(@PathVariable("id") Long id,
                                                  @RequestBody StatusTransitionsRequest request) {
        StatusDetailDto existing = statusService.get(id);
        ensurePermission(existing.type(), true);
        if (!StatusTypeKey.ORDER.name().equals(existing.type())) {
            throw new org.springframework.security.access.AccessDeniedException("Transitions are only available for order statuses");
        }
        return statusService.updateTransitions(id, request);
    }

    private void ensurePermission(String rawType, boolean manage) {
        if (!StringUtils.hasText(rawType)) {
            return;
        }
        StatusTypeKey key;
        try {
            key = StatusTypeKey.fromString(rawType);
        } catch (IllegalArgumentException ex) {
            return;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied");
        }
        String required = switch (key) {
            case ORDER -> manage ? "CONFIG.ORDER_STATUS.MANAGE" : "CONFIG.ORDER_STATUS.VIEW";
            case PAYMENT -> manage ? "CONFIG.PAYMENT_STATUS.MANAGE" : "CONFIG.PAYMENT_STATUS.VIEW";
        };
        boolean hasRequired = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> {
                    if (authority == null) {
                        return false;
                    }
                    if (manage) {
                        return authority.equals(required);
                    }
                    return authority.equals(required) || authority.equals(required.replace(".VIEW", ".MANAGE"));
                });
        if (!hasRequired) {
            throw new org.springframework.security.access.AccessDeniedException(
                    String.format(Locale.ROOT, "Missing permission %s", required));
        }
    }
}
