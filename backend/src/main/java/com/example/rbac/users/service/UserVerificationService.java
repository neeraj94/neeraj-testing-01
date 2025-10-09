package com.example.rbac.users.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.settings.service.TemplatedEmailSender;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserVerificationToken;
import com.example.rbac.users.repository.UserVerificationTokenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
public class UserVerificationService {

    private static final Duration TOKEN_TTL = Duration.ofDays(2);
    private final UserVerificationTokenRepository tokenRepository;
    private final TemplatedEmailSender emailSender;
    private final ActivityRecorder activityRecorder;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserVerificationService(UserVerificationTokenRepository tokenRepository,
                                   TemplatedEmailSender emailSender,
                                   ActivityRecorder activityRecorder) {
        this.tokenRepository = tokenRepository;
        this.emailSender = emailSender;
        this.activityRecorder = activityRecorder;
    }

    @Transactional
    public void initiateVerification(User user) {
        if (!requiresVerification(user)) {
            return;
        }
        tokenRepository.deleteByUserIdAndVerifiedAtIsNull(user.getId());
        UserVerificationToken token = new UserVerificationToken();
        token.setUser(user);
        token.setToken(generateToken());
        token.setExpiresAt(Instant.now().plus(TOKEN_TTL));
        token = tokenRepository.save(token);

        String verificationLink = emailSender.buildVerificationLink(token.getToken());
        boolean sent = emailSender.sendVerificationEmail(user, verificationLink, token.getExpiresAt());
        recordEvent("EMAIL_VERIFICATION_REQUEST", user, token, sent ? "SUCCESS" : "SKIPPED", sent);
    }

    @Transactional
    public VerificationResult verifyToken(String rawToken) {
        if (!StringUtils.hasText(rawToken)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verification token is required.");
        }
        String tokenValue = rawToken.trim();
        UserVerificationToken token = tokenRepository.findByToken(tokenValue)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Verification token is invalid."));

        if (token.isExpired()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verification token has expired. Please request a new email.");
        }

        if (token.isVerified()) {
            User user = token.getUser();
            return new VerificationResult(true, "Account already verified.", false, user != null ? user.getEmail() : null);
        }

        Instant now = Instant.now();
        token.setVerifiedAt(now);
        User user = token.getUser();
        if (user != null) {
            user.setEmailVerifiedAt(now);
        }
        tokenRepository.save(token);
        if (user != null) {
            tokenRepository.deleteByUserIdAndVerifiedAtIsNull(user.getId());
        }

        boolean welcomeSent = emailSender.sendWelcomeEmail(user, null);
        recordEvent("EMAIL_VERIFIED", user, token, "SUCCESS", welcomeSent);
        return new VerificationResult(true,
                welcomeSent ? "Email verified successfully. Welcome email sent." : "Email verified successfully.",
                welcomeSent,
                user != null ? user.getEmail() : null);
    }

    private boolean requiresVerification(User user) {
        return user != null
                && user.getId() != null
                && StringUtils.hasText(user.getEmail())
                && user.getEmailVerifiedAt() == null;
    }

    private String generateToken() {
        byte[] buffer = new byte[32];
        secureRandom.nextBytes(buffer);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }

    private void recordEvent(String activityType,
                             User user,
                             UserVerificationToken token,
                             String status,
                             boolean emailSent) {
        Map<String, Object> context = new HashMap<>();
        if (user != null) {
            context.put("userId", user.getId());
            context.put("email", user.getEmail());
        }
        context.put("tokenId", token.getId());
        context.put("emailSent", emailSent);
        activityRecorder.recordForUser(user, "Users", activityType, "Processed user email verification", status, context);
    }

    public static class VerificationResult {
        private final boolean success;
        private final String message;
        private final boolean welcomeEmailSent;
        private final String email;

        public VerificationResult(boolean success, String message, boolean welcomeEmailSent, String email) {
            this.success = success;
            this.message = message;
            this.welcomeEmailSent = welcomeEmailSent;
            this.email = email;
        }

        public boolean isSuccess() {
            return success;
        }

        public String getMessage() {
            return message;
        }

        public boolean isWelcomeEmailSent() {
            return welcomeEmailSent;
        }

        public String getEmail() {
            return email;
        }
    }
}
