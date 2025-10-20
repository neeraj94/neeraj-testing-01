package com.example.rbac.controllers.publicapi.settings;

import com.example.rbac.settings.dto.SettingsThemeDto;
import com.example.rbac.settings.service.SettingsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/settings")
public class PublicSettingsController {

    private final SettingsService settingsService;

    public PublicSettingsController(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @GetMapping("/theme")
    public SettingsThemeDto getTheme() {
        return settingsService.getTheme();
    }
}
