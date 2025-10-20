package com.example.rbac.admin.settings.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.admin.settings.dto.EmailSettingsDto;
import com.example.rbac.admin.settings.dto.EmailTestRequest;
import com.example.rbac.admin.settings.dto.EmailTestResponse;
import com.example.rbac.admin.settings.model.Setting;
import com.example.rbac.admin.settings.repository.SettingRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Properties;
import java.util.stream.Collectors;

@Service
public class EmailSettingsService {

    private static final Logger log = LoggerFactory.getLogger(EmailSettingsService.class);
    private static final List<String> EMAIL_SETTING_CODES = List.of(
            "email.driver",
            "email.smtp_host",
            "email.smtp_port",
            "email.smtp_username",
            "email.smtp_password",
            "email.smtp_encryption",
            "email.from_name",
            "email.from_address",
            "email.reply_to",
            "email.bcc_all",
            "email.signature",
            "email.header_html",
            "email.footer_html"
    );

    private final SettingRepository settingRepository;
    private final ActivityRecorder activityRecorder;

    public EmailSettingsService(SettingRepository settingRepository, ActivityRecorder activityRecorder) {
        this.settingRepository = settingRepository;
        this.activityRecorder = activityRecorder;
    }

    @Transactional(readOnly = true)
    public EmailSettingsDto getEmailSettings() {
        List<Setting> settings = settingRepository.findByCodeIn(EMAIL_SETTING_CODES);
        Map<String, Setting> byCode = settings.stream()
                .collect(Collectors.toMap(Setting::getCode, setting -> setting));

        EmailSettingsDto dto = new EmailSettingsDto();
        dto.setDriver(normalizeDriver(rawValue(byCode, "email.driver")));
        dto.setHost(trimmedValue(byCode, "email.smtp_host"));
        dto.setPort(integerValue(byCode, "email.smtp_port"));
        dto.setUsername(trimmedValue(byCode, "email.smtp_username"));
        dto.setPassword(rawValue(byCode, "email.smtp_password"));
        dto.setEncryption(normalizeEncryption(rawValue(byCode, "email.smtp_encryption")));
        dto.setFromName(trimmedValue(byCode, "email.from_name"));
        dto.setFromAddress(trimmedValue(byCode, "email.from_address"));
        dto.setReplyTo(trimmedValue(byCode, "email.reply_to"));
        dto.setBccAll(trimmedValue(byCode, "email.bcc_all"));
        dto.setSignature(rawValue(byCode, "email.signature"));
        dto.setHeaderHtml(rawValue(byCode, "email.header_html"));
        dto.setFooterHtml(rawValue(byCode, "email.footer_html"));
        return dto;
    }

    @Transactional
    public EmailTestResponse sendTestEmail(EmailTestRequest request) {
        EmailSettingsDto emailSettings = getEmailSettings();
        Map<String, Object> context = new LinkedHashMap<>();
        context.put("recipient", request.getRecipient());
        context.put("driver", Optional.ofNullable(emailSettings.getDriver()).orElse("smtp"));

        try {
            JavaMailSenderImpl mailSender = buildMailSender(emailSettings);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

            String fromAddress = firstNonBlank(
                    emailSettings.getFromAddress(),
                    emailSettings.getUsername(),
                    request.getRecipient()
            );
            if (fromAddress == null || fromAddress.isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Configure a sender email address before sending test emails.");
            }

            if (hasText(emailSettings.getFromName())) {
                helper.setFrom(new InternetAddress(fromAddress, emailSettings.getFromName()));
            } else {
                helper.setFrom(fromAddress);
            }
            helper.setTo(request.getRecipient());

            if (hasText(emailSettings.getReplyTo())) {
                helper.setReplyTo(emailSettings.getReplyTo());
            }

            String[] bccRecipients = parseAddresses(emailSettings.getBccAll());
            if (bccRecipients.length > 0) {
                helper.setBcc(bccRecipients);
            }

            String subject = Optional.ofNullable(request.getSubject())
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .orElse("Test email from your RBAC dashboard");
            helper.setSubject(subject);

            String baseMessage = Optional.ofNullable(request.getMessage())
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .orElse("This is a test email confirming that your SMTP settings are working as expected.");

            helper.setText(composeHtmlBody(emailSettings, baseMessage), true);

            mailSender.send(message);
            activityRecorder.record("Settings", "EMAIL_TEST", "Sent SMTP test email", "SUCCESS", context);
            return new EmailTestResponse("Test email sent successfully.");
        } catch (ApiException ex) {
            context.put("error", ex.getMessage());
            activityRecorder.record("Settings", "EMAIL_TEST", "Failed to send SMTP test email", "FAILED", context);
            throw ex;
        } catch (MessagingException | UnsupportedEncodingException ex) {
            String message = "Unable to compose test email: " + ex.getMessage();
            log.warn("Unable to compose SMTP test email", ex);
            context.put("error", message);
            activityRecorder.record("Settings", "EMAIL_TEST", "Failed to send SMTP test email", "FAILED", context);
            throw new ApiException(HttpStatus.BAD_REQUEST, message);
        } catch (MailException ex) {
            log.error("Failed to deliver SMTP test email: {}", ex.getMessage(), ex);
            context.put("error", ex.getMessage());
            activityRecorder.record("Settings", "EMAIL_TEST", "Failed to send SMTP test email", "FAILED", context);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Unable to send test email. Please verify your SMTP credentials and try again.");
        }
    }

    @Transactional(readOnly = true)
    public EmailDeliveryPreparation prepareDeliveryContext() {
        EmailSettingsDto emailSettings = getEmailSettings();
        String driver = Optional.ofNullable(emailSettings.getDriver())
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .orElse("smtp");

        if (!"smtp".equals(driver)) {
            log.debug("Email driver '{}' is not SMTP; skipping delivery context preparation", driver);
            return EmailDeliveryPreparation.unavailable("SMTP_DISABLED");
        }

        try {
            JavaMailSenderImpl mailSender = buildMailSender(emailSettings);
            return EmailDeliveryPreparation.available(new EmailDeliveryContext(emailSettings, mailSender));
        } catch (ApiException ex) {
            if (ex.getStatus() == HttpStatus.BAD_REQUEST) {
                log.debug("SMTP configuration incomplete: {}", ex.getMessage());
                return EmailDeliveryPreparation.unavailable("SMTP_CONFIGURATION_INVALID");
            }
            throw ex;
        }
    }

    private JavaMailSenderImpl buildMailSender(EmailSettingsDto settings) {
        String driver = Optional.ofNullable(settings.getDriver())
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .orElse("smtp");
        if (!"smtp".equals(driver)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Test emails are only supported when SMTP is enabled.");
        }

        String host = Optional.ofNullable(settings.getHost()).map(String::trim).orElse("");
        if (host.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Configure an SMTP host before sending test emails.");
        }

        int port = Optional.ofNullable(settings.getPort()).orElse(587);
        if (port <= 0) {
            port = 587;
        }

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setProtocol("smtp");
        sender.setHost(host);
        sender.setPort(port);

        if (hasText(settings.getUsername())) {
            sender.setUsername(settings.getUsername().trim());
        }
        if (settings.getPassword() != null) {
            sender.setPassword(settings.getPassword());
        }

        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.transport.protocol", "smtp");
        boolean hasAuth = hasText(settings.getUsername());
        properties.put("mail.smtp.auth", String.valueOf(hasAuth));

        String encryption = Optional.ofNullable(settings.getEncryption())
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .orElse("none");
        boolean useStartTls = "tls".equals(encryption);
        boolean useSsl = "ssl".equals(encryption);
        properties.put("mail.smtp.starttls.enable", String.valueOf(useStartTls));
        properties.put("mail.smtp.ssl.enable", String.valueOf(useSsl));
        properties.put("mail.smtp.connectiontimeout", "10000");
        properties.put("mail.smtp.timeout", "10000");
        properties.put("mail.smtp.writetimeout", "10000");
        if (useSsl) {
            properties.put("mail.smtp.socketFactory.port", String.valueOf(port));
        }

        return sender;
    }

    private String composeHtmlBody(EmailSettingsDto settings, String baseMessage) {
        StringBuilder builder = new StringBuilder();
        builder.append("<div style=\"font-family:Arial, sans-serif;font-size:14px;line-height:1.6;\">");

        if (hasText(settings.getHeaderHtml())) {
            builder.append(settings.getHeaderHtml());
        }

        builder.append("<p>")
                .append(HtmlUtils.htmlEscape(baseMessage).replace("\n", "<br />"))
                .append("</p>");

        if (hasText(settings.getSignature())) {
            builder.append("<p>")
                    .append(HtmlUtils.htmlEscape(settings.getSignature()).replace("\n", "<br />"))
                    .append("</p>");
        }

        if (hasText(settings.getFooterHtml())) {
            builder.append(settings.getFooterHtml());
        }

        builder.append("</div>");
        return builder.toString();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String firstNonBlank(String... candidates) {
        if (candidates == null) {
            return null;
        }
        for (String candidate : candidates) {
            if (candidate != null && !candidate.trim().isEmpty()) {
                return candidate.trim();
            }
        }
        return null;
    }

    private String[] parseAddresses(String raw) {
        if (raw == null) {
            return new String[0];
        }
        return Arrays.stream(raw.split("[,;]"))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toArray(String[]::new);
    }

    private String rawValue(Map<String, Setting> settings, String code) {
        Setting setting = settings.get(code);
        return setting != null ? setting.getValue() : null;
    }

    private String trimmedValue(Map<String, Setting> settings, String code) {
        String value = rawValue(settings, code);
        return value != null ? value.trim() : null;
    }

    private Integer integerValue(Map<String, Setting> settings, String code) {
        String value = trimmedValue(settings, code);
        if (value == null || value.isEmpty()) {
            return null;
        }
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException ex) {
            log.warn("Invalid numeric value stored for setting '{}': {}", code, value);
            return null;
        }
    }

    private String normalizeDriver(String value) {
        if (value == null || value.isBlank()) {
            return "smtp";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEncryption(String value) {
        if (value == null || value.isBlank()) {
            return "none";
        }
        return value.trim();
    }

    public static class EmailDeliveryContext {
        private final EmailSettingsDto settings;
        private final JavaMailSenderImpl mailSender;

        public EmailDeliveryContext(EmailSettingsDto settings, JavaMailSenderImpl mailSender) {
            this.settings = settings;
            this.mailSender = mailSender;
        }

        public EmailSettingsDto getSettings() {
            return settings;
        }

        public JavaMailSenderImpl getMailSender() {
            return mailSender;
        }
    }

    public static class EmailDeliveryPreparation {
        private final EmailDeliveryContext context;
        private final String failureReason;

        private EmailDeliveryPreparation(EmailDeliveryContext context, String failureReason) {
            this.context = context;
            this.failureReason = failureReason;
        }

        public static EmailDeliveryPreparation available(EmailDeliveryContext context) {
            return new EmailDeliveryPreparation(context, null);
        }

        public static EmailDeliveryPreparation unavailable(String failureReason) {
            return new EmailDeliveryPreparation(null, failureReason);
        }

        public boolean isReady() {
            return context != null;
        }

        public Optional<EmailDeliveryContext> getContext() {
            return Optional.ofNullable(context);
        }

        public Optional<String> getFailureReason() {
            return Optional.ofNullable(failureReason);
        }
    }
}
