package com.example.rbac.settings.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.settings.dto.EmailSettingsDto;
import com.example.rbac.settings.model.EmailTemplate;
import com.example.rbac.settings.repository.EmailTemplateRepository;
import com.example.rbac.users.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TemplatedEmailSender {

    private static final Logger log = LoggerFactory.getLogger(TemplatedEmailSender.class);
    private static final String VERIFICATION_TEMPLATE_CODE = "staff_verification_request";
    private static final String WELCOME_TEMPLATE_CODE = "user_signup_welcome";
    private static final DateTimeFormatter EXPIRY_FORMATTER =
            DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a z", Locale.ENGLISH)
                    .withZone(ZoneId.systemDefault());

    private final EmailTemplateRepository emailTemplateRepository;
    private final EmailSettingsService emailSettingsService;
    private final SettingsService settingsService;
    private final AppUrlProperties appUrlProperties;
    private final ActivityRecorder activityRecorder;

    public TemplatedEmailSender(EmailTemplateRepository emailTemplateRepository,
                                EmailSettingsService emailSettingsService,
                                SettingsService settingsService,
                                AppUrlProperties appUrlProperties,
                                ActivityRecorder activityRecorder) {
        this.emailTemplateRepository = emailTemplateRepository;
        this.emailSettingsService = emailSettingsService;
        this.settingsService = settingsService;
        this.appUrlProperties = appUrlProperties;
        this.activityRecorder = activityRecorder;
    }

    public boolean sendVerificationEmail(User user, String verificationLink, Instant expiresAt) {
        if (!isEmailable(user) || !StringUtils.hasText(verificationLink) || expiresAt == null) {
            return false;
        }
        Map<String, String> tokens = new HashMap<>();
        tokens.put("{{user_full_name}}", resolveName(user));
        tokens.put("{{verification_link}}", verificationLink);
        tokens.put("{{verification_expires_at}}", EXPIRY_FORMATTER.format(expiresAt));
        return sendTemplate(VERIFICATION_TEMPLATE_CODE, user.getEmail(), tokens, buildAuditContext(user, "VERIFICATION"));
    }

    public boolean sendWelcomeEmail(User user, String temporaryPassword) {
        if (!isEmailable(user)) {
            return false;
        }
        Map<String, String> tokens = new HashMap<>();
        tokens.put("{{user_full_name}}", resolveName(user));
        tokens.put("{{user_email}}", Optional.ofNullable(user.getEmail()).orElse(""));
        tokens.put("{{temporary_password}}", Optional.ofNullable(temporaryPassword).orElse(""));
        return sendTemplate(WELCOME_TEMPLATE_CODE, user.getEmail(), tokens, buildAuditContext(user, "WELCOME"));
    }

    public String buildVerificationLink(String token) {
        String base = Optional.ofNullable(appUrlProperties.getVerification())
                .filter(StringUtils::hasText)
                .orElse(appUrlProperties.getLogin());
        if (!StringUtils.hasText(base)) {
            return token;
        }
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(base.trim());
        builder.replaceQueryParam("token", token);
        return builder.build().toUriString();
    }

    private boolean sendTemplate(String templateCode,
                                 String recipient,
                                 Map<String, String> customTokens,
                                 Map<String, Object> auditContext) {
        if (!StringUtils.hasText(recipient)) {
            return false;
        }
        Optional<EmailTemplate> templateOpt = emailTemplateRepository.findByCodeIgnoreCase(templateCode)
                .filter(EmailTemplate::isEnabled);
        if (templateOpt.isEmpty()) {
            log.debug("Email template '{}' not found or disabled; skipping delivery", templateCode);
            recordSkip(templateCode, recipient, auditContext, "TEMPLATE_DISABLED");
            return false;
        }
        EmailSettingsService.EmailDeliveryPreparation preparation = emailSettingsService.prepareDeliveryContext();
        if (!preparation.isReady()) {
            String reason = preparation.getFailureReason().orElse("SMTP_DISABLED");
            log.debug("SMTP configuration unavailable (reason: {}) for template '{}'", reason, templateCode);
            recordSkip(templateCode, recipient, auditContext, reason);
            return false;
        }

        EmailSettingsService.EmailDeliveryContext deliveryContext = preparation.getContext().orElseThrow();
        JavaMailSenderImpl mailSender = deliveryContext.getMailSender();
        Map<String, String> tokens = buildBaseTokens(deliveryContext.getSettings());
        if (customTokens != null) {
            tokens.putAll(customTokens.entrySet().stream()
                    .filter(entry -> entry.getKey() != null)
                    .collect(Collectors.toMap(Map.Entry::getKey, entry -> Optional.ofNullable(entry.getValue()).orElse(""))));
        }

        EmailTemplate template = templateOpt.get();
        String subject = render(template.getSubject(), tokens);
        String bodyHtml = wrapWithLayout(render(template.getBodyHtml(), tokens), deliveryContext.getSettings());

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            applyFrom(helper, deliveryContext);
            helper.setTo(recipient);
            applyReplyTo(helper, deliveryContext.getSettings());
            applyBcc(helper, deliveryContext.getSettings());
            helper.setSubject(subject);
            helper.setText(bodyHtml, true);
            mailSender.send(message);
            recordSuccess(templateCode, recipient, auditContext);
            return true;
        } catch (MessagingException | UnsupportedEncodingException | MailException ex) {
            log.warn("Failed to send email using template '{}': {}", templateCode, ex.getMessage(), ex);
            recordFailure(templateCode, recipient, auditContext, ex.getMessage());
            return false;
        }
    }

    private Map<String, String> buildBaseTokens(EmailSettingsDto settings) {
        Map<String, String> tokens = new HashMap<>();
        tokens.put("{{app_name}}", settingsService.resolveApplicationName());
        tokens.put("{{support_email}}", settingsService.resolveSupportEmail());
        tokens.put("{{email_signature}}", formatMultiline(settings.getSignature()));
        tokens.put("{{login_url}}", Optional.ofNullable(appUrlProperties.getLogin()).filter(StringUtils::hasText).orElse(""));
        tokens.put("{{current_year}}", String.valueOf(java.time.Year.now().getValue()));
        tokens.putIfAbsent("{{temporary_password}}", "");
        return tokens;
    }

    private String wrapWithLayout(String body, EmailSettingsDto settings) {
        StringBuilder builder = new StringBuilder();
        builder.append("<div style=\"font-family:Arial, sans-serif;font-size:14px;line-height:1.6;\">");
        if (StringUtils.hasText(settings.getHeaderHtml())) {
            builder.append(settings.getHeaderHtml());
        }
        builder.append(body);
        if (StringUtils.hasText(settings.getFooterHtml())) {
            builder.append(settings.getFooterHtml());
        }
        builder.append("</div>");
        return builder.toString();
    }

    private void applyFrom(MimeMessageHelper helper, EmailSettingsService.EmailDeliveryContext context)
            throws MessagingException, UnsupportedEncodingException {
        EmailSettingsDto settings = context.getSettings();
        String fromAddress = firstNonBlank(settings.getFromAddress(), settings.getUsername());
        if (!StringUtils.hasText(fromAddress)) {
            throw new MessagingException("No sender address configured");
        }
        if (StringUtils.hasText(settings.getFromName())) {
            helper.setFrom(new InternetAddress(fromAddress, settings.getFromName()));
        } else {
            helper.setFrom(fromAddress);
        }
    }

    private void applyReplyTo(MimeMessageHelper helper, EmailSettingsDto settings) throws MessagingException {
        if (StringUtils.hasText(settings.getReplyTo())) {
            helper.setReplyTo(settings.getReplyTo().trim());
        }
    }

    private void applyBcc(MimeMessageHelper helper, EmailSettingsDto settings) throws MessagingException {
        if (!StringUtils.hasText(settings.getBccAll())) {
            return;
        }
        String[] bccRecipients = settings.getBccAll().split("[,;]");
        Set<String> cleaned = java.util.Arrays.stream(bccRecipients)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toSet());
        if (!cleaned.isEmpty()) {
            helper.setBcc(cleaned.toArray(String[]::new));
        }
    }

    private Map<String, Object> buildAuditContext(User user, String type) {
        Map<String, Object> context = new HashMap<>();
        if (user != null) {
            context.put("userId", user.getId());
            context.put("email", user.getEmail());
        }
        context.put("type", type);
        return context;
    }

    private void recordSuccess(String templateCode, String recipient, Map<String, Object> context) {
        Map<String, Object> audit = new HashMap<>(context);
        audit.put("template", templateCode);
        audit.put("recipient", recipient);
        activityRecorder.record("Email", "SEND", "Sent email template", "SUCCESS", audit);
    }

    private void recordSkip(String templateCode, String recipient, Map<String, Object> context, String reason) {
        Map<String, Object> audit = new HashMap<>(context);
        audit.put("template", templateCode);
        audit.put("recipient", recipient);
        audit.put("reason", reason);
        activityRecorder.record("Email", "SEND", "Skipped email delivery", "SKIPPED", audit);
    }

    private void recordFailure(String templateCode, String recipient, Map<String, Object> context, String message) {
        Map<String, Object> audit = new HashMap<>(context);
        audit.put("template", templateCode);
        audit.put("recipient", recipient);
        audit.put("error", message);
        activityRecorder.record("Email", "SEND", "Failed to send email template", "FAILED", audit);
    }

    private String render(String template, Map<String, String> tokens) {
        if (template == null) {
            return "";
        }
        String rendered = template;
        for (Map.Entry<String, String> entry : tokens.entrySet()) {
            rendered = rendered.replace(entry.getKey(), Optional.ofNullable(entry.getValue()).orElse(""));
        }
        return rendered;
    }

    private boolean isEmailable(User user) {
        return user != null && StringUtils.hasText(user.getEmail());
    }

    private String resolveName(User user) {
        if (user == null) {
            return "";
        }
        if (StringUtils.hasText(user.getFullName())) {
            return user.getFullName();
        }
        return Optional.ofNullable(user.getEmail()).orElse("");
    }

    private String formatMultiline(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.trim().replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br />");
    }

    private String firstNonBlank(String... candidates) {
        if (candidates == null) {
            return null;
        }
        for (String candidate : candidates) {
            if (StringUtils.hasText(candidate)) {
                return candidate.trim();
            }
        }
        return null;
    }
}
