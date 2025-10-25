package com.example.rbac.admin.configuration.status.controller;

import com.example.rbac.admin.configuration.status.dto.StatusConfigDto;
import com.example.rbac.admin.configuration.status.dto.StatusConfigRequest;
import com.example.rbac.admin.configuration.status.model.StatusCategory;
import com.example.rbac.admin.configuration.status.service.StatusConfigService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/config/status")
public class StatusConfigController {

    private final StatusConfigService statusConfigService;

    public StatusConfigController(StatusConfigService statusConfigService) {
        this.statusConfigService = statusConfigService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('CONFIG.STATUS.VIEW', 'CONFIG.STATUS.MANAGE')")
    public List<StatusConfigDto> list(@RequestParam(name = "category", required = false) StatusCategory category,
                                      @RequestParam(name = "search", required = false) String search) {
        return statusConfigService.list(category, search);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONFIG.STATUS.MANAGE')")
    public StatusConfigDto create(@Valid @RequestBody StatusConfigRequest request) {
        return statusConfigService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONFIG.STATUS.MANAGE')")
    public StatusConfigDto update(@PathVariable("id") Long id, @Valid @RequestBody StatusConfigRequest request) {
        return statusConfigService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONFIG.STATUS.MANAGE')")
    public void delete(@PathVariable("id") Long id) {
        statusConfigService.delete(id);
    }

    @PatchMapping("/{id}/default")
    @PreAuthorize("hasAuthority('CONFIG.STATUS.MANAGE')")
    public StatusConfigDto markAsDefault(@PathVariable("id") Long id) {
        return statusConfigService.markAsDefault(id);
    }
}
