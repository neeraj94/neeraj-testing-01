package com.example.rbac.settings.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.settings.dto.EmailMergeFieldDto;
import com.example.rbac.settings.dto.EmailTemplateDetailDto;
import com.example.rbac.settings.dto.EmailTemplateListItemDto;
import com.example.rbac.settings.dto.EmailTemplateListResponse;
import com.example.rbac.settings.dto.EmailTemplateUpdateRequest;
import com.example.rbac.settings.model.EmailTemplate;
import com.example.rbac.settings.repository.EmailTemplateRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class EmailTemplateService {

    private static final Map<String, List<EmailMergeFieldDto>> MERGE_FIELDS_BY_CODE;

    static {
        Map<String, List<EmailMergeFieldDto>> mergeFields = new LinkedHashMap<>();
        List<EmailMergeFieldDto> baseFields = List.of(
                new EmailMergeFieldDto("{{app_name}}", "Application name", "Displays the configured application name."),
                new EmailMergeFieldDto("{{support_email}}", "Support email", "Primary support contact email address."),
                new EmailMergeFieldDto("{{email_signature}}", "Email signature", "Signature configured in email settings."),
                new EmailMergeFieldDto("{{login_url}}", "Login URL", "Link to the application login page."),
                new EmailMergeFieldDto("{{current_year}}", "Current year", "The current calendar year.")
        );

        mergeFields.put("default", baseFields);

        mergeFields.put("user_signup_welcome", List.of(
                new EmailMergeFieldDto("{{user_full_name}}", "User full name", "Full name of the recipient."),
                new EmailMergeFieldDto("{{user_email}}", "User email", "Email address of the recipient."),
                new EmailMergeFieldDto("{{temporary_password}}", "Temporary password", "Temporary password issued during onboarding."),
                new EmailMergeFieldDto("{{login_url}}", "Login URL", "Link to the application login page."),
                new EmailMergeFieldDto("{{email_signature}}", "Email signature", "Signature configured in email settings.")
        ));

        mergeFields.put("staff_verification_request", List.of(
                new EmailMergeFieldDto("{{user_full_name}}", "User full name", "Full name of the recipient."),
                new EmailMergeFieldDto("{{verification_link}}", "Verification link", "Unique link used to verify the account."),
                new EmailMergeFieldDto("{{verification_expires_at}}", "Verification expiry", "Expiration date and time for the verification link."),
                new EmailMergeFieldDto("{{email_signature}}", "Email signature", "Signature configured in email settings."),
                new EmailMergeFieldDto("{{support_email}}", "Support email", "Primary support contact email address.")
        ));

        MERGE_FIELDS_BY_CODE = Collections.unmodifiableMap(mergeFields);
    }

    private final EmailTemplateRepository emailTemplateRepository;
    private final ActivityRecorder activityRecorder;

    public EmailTemplateService(EmailTemplateRepository emailTemplateRepository, ActivityRecorder activityRecorder) {
        this.emailTemplateRepository = emailTemplateRepository;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public EmailTemplateListResponse listTemplates() {
        List<EmailTemplateListItemDto> templates = emailTemplateRepository.findAllByOrderByCategoryAscNameAsc()
                .stream()
                .map(this::toListDto)
                .collect(Collectors.toList());
        return new EmailTemplateListResponse(templates);
    }

    @Transactional(readOnly = true)
    public EmailTemplateDetailDto getTemplate(Long id) {
        EmailTemplate template = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Email template not found"));
        return toDetailDto(template);
    }

    @Transactional
    public EmailTemplateDetailDto updateTemplate(Long id, EmailTemplateUpdateRequest request) {
        EmailTemplate template = emailTemplateRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Email template not found"));

        boolean changed = false;
        boolean enabled = Boolean.TRUE.equals(request.getEnabled());
        if (template.isEnabled() != enabled) {
            template.setEnabled(enabled);
            changed = true;
        }

        String normalizedSubject = normalizeSubject(request.getSubject());
        if (!Objects.equals(template.getSubject(), normalizedSubject)) {
            template.setSubject(normalizedSubject);
            changed = true;
        }

        String normalizedBody = normalizeBody(request.getBodyHtml());
        if (!Objects.equals(template.getBodyHtml(), normalizedBody)) {
            template.setBodyHtml(normalizedBody);
            changed = true;
        }

        if (changed) {
            emailTemplateRepository.save(template);
            Map<String, Object> context = new LinkedHashMap<>();
            context.put("templateCode", template.getCode());
            context.put("templateId", template.getId());
            context.put("enabled", template.isEnabled());
            activityRecorder.record("Settings", "EMAIL_TEMPLATE_UPDATE", "Updated email template", "SUCCESS", context);
        }

        return toDetailDto(template);
    }

    private String normalizeSubject(String subject) {
        if (subject == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Subject is required");
        }
        String trimmed = subject.trim();
        if (trimmed.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Subject cannot be blank");
        }
        return trimmed;
    }

    private String normalizeBody(String body) {
        if (!StringUtils.hasText(body)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email body cannot be empty");
        }
        return body.trim();
    }

    private EmailTemplateListItemDto toListDto(EmailTemplate template) {
        EmailTemplateListItemDto dto = new EmailTemplateListItemDto();
        dto.setId(template.getId());
        dto.setCode(template.getCode());
        dto.setName(template.getName());
        dto.setCategory(template.getCategory());
        dto.setDescription(template.getDescription());
        dto.setEnabled(template.isEnabled());
        dto.setSubject(template.getSubject());
        dto.setUpdatedAt(toOffsetDateTime(template.getUpdatedAt()));
        return dto;
    }

    private EmailTemplateDetailDto toDetailDto(EmailTemplate template) {
        EmailTemplateDetailDto dto = new EmailTemplateDetailDto();
        dto.setId(template.getId());
        dto.setCode(template.getCode());
        dto.setName(template.getName());
        dto.setCategory(template.getCategory());
        dto.setDescription(template.getDescription());
        dto.setEnabled(template.isEnabled());
        dto.setSubject(template.getSubject());
        dto.setUpdatedAt(toOffsetDateTime(template.getUpdatedAt()));
        dto.setBodyHtml(template.getBodyHtml());
        dto.setAvailableMergeFields(resolveMergeFields(template.getCode()));
        return dto;
    }

    private List<EmailMergeFieldDto> resolveMergeFields(String code) {
        if (code == null) {
            return MERGE_FIELDS_BY_CODE.getOrDefault("default", List.of());
        }
        String normalized = code.trim().toLowerCase(Locale.ROOT);
        List<EmailMergeFieldDto> fields = MERGE_FIELDS_BY_CODE.get(normalized);
        if (fields != null) {
            return fields;
        }
        return MERGE_FIELDS_BY_CODE.getOrDefault("default", List.of());
    }

    private OffsetDateTime toOffsetDateTime(java.time.LocalDateTime time) {
        if (time == null) {
            return null;
        }
        return time.atOffset(ZoneOffset.UTC);
    }
}
