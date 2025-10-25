package com.example.rbac.admin.settings.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.settings.dto.EmailSettingsDto;
import com.example.rbac.admin.settings.model.EmailTemplate;
import com.example.rbac.admin.settings.repository.EmailTemplateRepository;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.client.checkout.dto.AppliedCouponDto;
import com.example.rbac.client.checkout.dto.CheckoutAddressDto;
import com.example.rbac.client.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.client.checkout.dto.OrderLineDto;
import com.example.rbac.client.checkout.dto.OrderSummaryDto;
import com.example.rbac.client.checkout.dto.PaymentMethodDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Currency;
import java.util.HashMap;
import java.util.List;
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
    private static final String ORDER_CONFIRMATION_TEMPLATE_CODE = "order_confirmation_customer";
    private static final DateTimeFormatter EXPIRY_FORMATTER =
            DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a z", Locale.ENGLISH)
                    .withZone(ZoneId.systemDefault());
    private static final DateTimeFormatter ORDER_DATE_FORMATTER =
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

    public boolean sendOrderConfirmationEmail(CheckoutOrderResponse order) {
        Map<String, Object> auditContext = buildOrderAuditContext(order);
        String recipient = order != null ? normalizeEmail(order.getCustomerEmail()) : null;
        if (!StringUtils.hasText(recipient)) {
            recordSkip(ORDER_CONFIRMATION_TEMPLATE_CODE, recipient, auditContext, "RECIPIENT_MISSING");
            return false;
        }
        Map<String, String> tokens = buildOrderTokens(order);
        return sendTemplate(
                ORDER_CONFIRMATION_TEMPLATE_CODE,
                recipient,
                tokens,
                auditContext);
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

    private Map<String, String> buildOrderTokens(CheckoutOrderResponse order) {
        Map<String, String> tokens = new HashMap<>();
        tokens.put("{{customer_name}}", resolveCustomerName(order));
        tokens.put("{{order_number}}", Optional.ofNullable(order.getOrderNumber()).orElse(""));
        tokens.put("{{order_date}}", formatOrderDate(order.getCreatedAt()));
        tokens.put("{{order_status}}", Optional.ofNullable(order.getStatus()).orElse(""));
        OrderSummaryDto summary = order.getSummary();
        tokens.put("{{order_total}}", formatMoney(summary != null ? summary.getGrandTotal() : null));
        tokens.put("{{order_items_table}}", buildOrderItemsTable(order));
        tokens.put("{{billing_address}}", formatAddress(order.getBillingAddress()));
        tokens.put("{{shipping_address}}", formatAddress(order.getShippingAddress()));
        tokens.put("{{shipping_method}}", formatShippingMethod(summary));
        tokens.put("{{payment_method}}", formatPaymentMethod(order.getPaymentMethod()));
        tokens.put("{{customer_notes}}", resolveCustomerNotes(order));
        return tokens;
    }

    private Map<String, Object> buildOrderAuditContext(CheckoutOrderResponse order) {
        Map<String, Object> context = new HashMap<>();
        context.put("type", "ORDER_CONFIRMATION");
        if (order != null) {
            context.put("orderId", order.getOrderId());
            context.put("orderNumber", order.getOrderNumber());
            context.put("customerId", order.getCustomerId());
            context.put("email", normalizeEmail(order.getCustomerEmail()));
        }
        return context;
    }

    private String formatOrderDate(Instant createdAt) {
        if (createdAt == null) {
            return "";
        }
        return ORDER_DATE_FORMATTER.format(createdAt);
    }

    private String resolveCustomerName(CheckoutOrderResponse order) {
        if (order == null) {
            return "";
        }
        if (StringUtils.hasText(order.getCustomerName())) {
            return order.getCustomerName().trim();
        }
        return Optional.ofNullable(normalizeEmail(order.getCustomerEmail())).orElse("");
    }

    private String buildOrderItemsTable(CheckoutOrderResponse order) {
        List<OrderLineDto> lines = order != null ? order.getLines() : List.of();
        OrderSummaryDto summary = order != null ? order.getSummary() : null;
        StringBuilder html = new StringBuilder();
        html.append("<table style=\"width:100%;border-collapse:collapse;\">");
        html.append("<thead><tr>")
                .append("<th style=\"text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;\">Item</th>")
                .append("<th style=\"text-align:center;padding:8px;border-bottom:1px solid #e2e8f0;\">Qty</th>")
                .append("<th style=\"text-align:right;padding:8px;border-bottom:1px solid #e2e8f0;\">Price</th>")
                .append("<th style=\"text-align:right;padding:8px;border-bottom:1px solid #e2e8f0;\">Total</th>")
                .append("</tr></thead>");
        html.append("<tbody>");
        if (CollectionUtils.isEmpty(lines)) {
            html.append("<tr><td colspan=\"4\" style=\"padding:12px;text-align:center;color:#64748b;\">No items found.</td></tr>");
        } else {
            for (OrderLineDto line : lines) {
                if (line == null) {
                    continue;
                }
                html.append("<tr>");
                html.append("<td style=\"padding:8px;border-bottom:1px solid #f1f5f9;\">")
                        .append(formatLineName(line))
                        .append("</td>");
                html.append("<td style=\"padding:8px;text-align:center;border-bottom:1px solid #f1f5f9;\">")
                        .append(Optional.ofNullable(line.getQuantity()).map(String::valueOf).orElse(""))
                        .append("</td>");
                html.append("<td style=\"padding:8px;text-align:right;border-bottom:1px solid #f1f5f9;\">")
                        .append(formatMoney(line.getUnitPrice()))
                        .append("</td>");
                html.append("<td style=\"padding:8px;text-align:right;border-bottom:1px solid #f1f5f9;\">")
                        .append(formatMoney(line.getLineTotal()))
                        .append("</td>");
                html.append("</tr>");
            }
        }

        appendSummaryRow(html, "Subtotal", summary != null ? summary.getProductTotal() : null, false, false);
        appendSummaryRow(html, "Shipping", summary != null ? summary.getShippingTotal() : null, false, false);
        appendSummaryRow(html, "Tax", summary != null ? summary.getTaxTotal() : null, false, false);
        appendDiscountRow(html, summary);
        appendSummaryRow(html, "Grand total", summary != null ? summary.getGrandTotal() : null, true, false);

        html.append("</tbody></table>");
        return html.toString();
    }

    private void appendDiscountRow(StringBuilder html, OrderSummaryDto summary) {
        if (summary == null) {
            return;
        }
        BigDecimal discount = summary.getDiscountTotal();
        if (discount == null || discount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        AppliedCouponDto coupon = summary.getAppliedCoupon();
        String label = "Discount";
        if (coupon != null && StringUtils.hasText(coupon.getCode())) {
            label = label + " (" + coupon.getCode() + ")";
        }
        appendSummaryRow(html, label, discount, false, true);
    }

    private void appendSummaryRow(StringBuilder html, String label, BigDecimal amount, boolean emphasize, boolean negative) {
        if (amount == null) {
            return;
        }
        String formatted = formatMoney(amount.abs());
        if (!StringUtils.hasText(formatted)) {
            return;
        }
        if (negative) {
            formatted = "-" + formatted;
        }
        String textStyle = emphasize ? "font-weight:600;font-size:15px;" : "";
        html.append("<tr>");
        html.append("<td colspan=\"3\" style=\"padding:8px;text-align:right;border-bottom:1px solid #f1f5f9;")
                .append(textStyle)
                .append("\">")
                .append(HtmlUtils.htmlEscape(label))
                .append("</td>");
        html.append("<td style=\"padding:8px;text-align:right;border-bottom:1px solid #f1f5f9;")
                .append(textStyle)
                .append("\">")
                .append(formatted)
                .append("</td>")
                .append("</tr>");
    }

    private String formatLineName(OrderLineDto line) {
        String name = HtmlUtils.htmlEscape(Optional.ofNullable(line.getName()).orElse(""));
        String variant = Optional.ofNullable(line.getVariantLabel())
                .filter(StringUtils::hasText)
                .map(HtmlUtils::htmlEscape)
                .orElse("");
        String sku = Optional.ofNullable(line.getVariantSku())
                .filter(StringUtils::hasText)
                .map(HtmlUtils::htmlEscape)
                .orElse("");
        List<String> details = new ArrayList<>();
        if (StringUtils.hasText(variant)) {
            details.add(variant);
        }
        if (StringUtils.hasText(sku)) {
            details.add("SKU: " + sku);
        }
        if (details.isEmpty()) {
            return name;
        }
        return name + "<div style=\"color:#64748b;font-size:12px;margin-top:4px;\">" + String.join(" • ", details) + "</div>";
    }

    private String formatAddress(CheckoutAddressDto address) {
        if (address == null) {
            return "";
        }
        List<String> lines = new ArrayList<>();
        if (StringUtils.hasText(address.getFullName())) {
            lines.add(address.getFullName().trim());
        }
        if (StringUtils.hasText(address.getAddressLine1())) {
            lines.add(address.getAddressLine1().trim());
        }
        if (StringUtils.hasText(address.getAddressLine2())) {
            lines.add(address.getAddressLine2().trim());
        }
        if (StringUtils.hasText(address.getLandmark())) {
            lines.add(address.getLandmark().trim());
        }

        StringBuilder cityLine = new StringBuilder();
        if (StringUtils.hasText(address.getCityName())) {
            cityLine.append(address.getCityName().trim());
        }
        if (StringUtils.hasText(address.getStateName())) {
            if (cityLine.length() > 0) {
                cityLine.append(", ");
            }
            cityLine.append(address.getStateName().trim());
        }
        if (StringUtils.hasText(address.getPinCode())) {
            if (cityLine.length() > 0) {
                cityLine.append(" ");
            }
            cityLine.append(address.getPinCode().trim());
        }
        if (cityLine.length() > 0) {
            lines.add(cityLine.toString());
        }

        if (StringUtils.hasText(address.getCountryName())) {
            lines.add(address.getCountryName().trim());
        }
        if (StringUtils.hasText(address.getMobileNumber())) {
            lines.add("Phone: " + address.getMobileNumber().trim());
        }

        return String.join("\n", lines);
    }

    private String formatShippingMethod(OrderSummaryDto summary) {
        if (summary == null) {
            return "";
        }
        String name = Optional.ofNullable(summary.getShippingMethod()).filter(StringUtils::hasText).orElse("");
        String cost = formatMoney(summary.getShippingTotal());
        if (StringUtils.hasText(name) && StringUtils.hasText(cost)) {
            return name + " (" + cost + ")";
        }
        if (StringUtils.hasText(name)) {
            return name;
        }
        return cost;
    }

    private String formatPaymentMethod(PaymentMethodDto paymentMethod) {
        if (paymentMethod == null) {
            return "";
        }
        String displayName = Optional.ofNullable(paymentMethod.getDisplayName()).orElse("").trim();
        String notes = Optional.ofNullable(paymentMethod.getNotes()).orElse("").trim();
        if (StringUtils.hasText(displayName) && StringUtils.hasText(notes)) {
            return displayName + " - " + notes;
        }
        if (StringUtils.hasText(displayName)) {
            return displayName;
        }
        return notes;
    }

    private String resolveCustomerNotes(CheckoutOrderResponse order) {
        return "";
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) {
            return "";
        }
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        String currencyCode = settingsService.resolveBaseCurrency();
        if (!StringUtils.hasText(currencyCode)) {
            return scaled.toPlainString();
        }
        try {
            Currency currency = Currency.getInstance(currencyCode);
            NumberFormat formatter = NumberFormat.getCurrencyInstance(Locale.US);
            formatter.setCurrency(currency);
            return formatter.format(scaled);
        } catch (IllegalArgumentException ex) {
            return currencyCode + " " + scaled.toPlainString();
        }
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

    private String normalizeEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }
        return email.trim();
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
