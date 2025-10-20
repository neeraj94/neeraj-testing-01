package com.example.rbac.admin.settings.controller;

import com.example.rbac.admin.settings.dto.EmailTemplateDetailDto;
import com.example.rbac.admin.settings.dto.EmailTemplateListResponse;
import com.example.rbac.admin.settings.dto.EmailTemplateUpdateRequest;
import com.example.rbac.admin.settings.service.EmailTemplateService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/settings/email/templates")
public class EmailTemplateController {

    private final EmailTemplateService emailTemplateService;

    public EmailTemplateController(EmailTemplateService emailTemplateService) {
        this.emailTemplateService = emailTemplateService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public EmailTemplateListResponse listTemplates() {
        return emailTemplateService.listTemplates();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_VIEW')")
    public EmailTemplateDetailDto getTemplate(@PathVariable Long id) {
        return emailTemplateService.getTemplate(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SETTINGS_UPDATE')")
    public EmailTemplateDetailDto updateTemplate(@PathVariable Long id,
                                                 @Valid @RequestBody EmailTemplateUpdateRequest request) {
        return emailTemplateService.updateTemplate(id, request);
    }
}
