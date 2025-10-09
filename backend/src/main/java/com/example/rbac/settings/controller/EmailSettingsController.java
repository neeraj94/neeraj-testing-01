package com.example.rbac.settings.controller;

import com.example.rbac.settings.dto.EmailSettingsDto;
import com.example.rbac.settings.dto.EmailTestRequest;
import com.example.rbac.settings.dto.EmailTestResponse;
import com.example.rbac.settings.service.EmailSettingsService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings/email")
public class EmailSettingsController {

    private final EmailSettingsService emailSettingsService;

    public EmailSettingsController(EmailSettingsService emailSettingsService) {
        this.emailSettingsService = emailSettingsService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public EmailSettingsDto getEmailSettings() {
        return emailSettingsService.getEmailSettings();
    }

    @PostMapping("/test")
    @PreAuthorize("hasAuthority('SETTINGS_UPDATE')")
    public EmailTestResponse sendTestEmail(@Valid @RequestBody EmailTestRequest request) {
        return emailSettingsService.sendTestEmail(request);
    }
}
