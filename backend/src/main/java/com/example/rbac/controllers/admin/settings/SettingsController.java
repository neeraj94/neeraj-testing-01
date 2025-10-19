package com.example.rbac.controllers.admin.settings;

import com.example.rbac.settings.dto.SettingsResponse;
import com.example.rbac.settings.dto.SettingsUpdateRequest;
import com.example.rbac.settings.service.SettingsService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
public class SettingsController {

    private final SettingsService settingsService;

    public SettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public SettingsResponse getSettings() {
        return settingsService.getSettings();
    }

    @PatchMapping
    @PreAuthorize("hasAuthority('SETTINGS_UPDATE')")
    public SettingsResponse updateSettings(@Valid @RequestBody SettingsUpdateRequest request) {
        return settingsService.updateSettings(request);
    }

}
