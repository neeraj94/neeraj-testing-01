package com.example.rbac.common.auth.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.settings.service.SettingsService;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.mapper.UserMapper;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.client.auth.token.RefreshToken;
import com.example.rbac.client.auth.token.RefreshTokenRepository;
import com.example.rbac.common.auth.dto.AuthResponse;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.config.JwtService;
import jakarta.transaction.Transactional;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public abstract class BaseAuthService {

    protected static final String CUSTOMER_ROLE_KEY = "CUSTOMER";
    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;

    private final com.example.rbac.admin.users.repository.UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final SettingsService settingsService;
    private final ActivityRecorder activityRecorder;

    protected BaseAuthService(com.example.rbac.admin.users.repository.UserRepository userRepository,
                              RefreshTokenRepository refreshTokenRepository,
                              PasswordEncoder passwordEncoder,
                              AuthenticationManager authenticationManager,
                              JwtService jwtService,
                              UserMapper userMapper,
                              SettingsService settingsService,
                              ActivityRecorder activityRecorder) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.settingsService = settingsService;
        this.activityRecorder = activityRecorder;
    }

    protected abstract void enforcePortalAccess(User user);

    @Transactional
    protected AuthResult loginInternal(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!user.isActive()) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(user));
            context.put("reason", "INACTIVE");
            activityRecorder.recordForUser(user, "Authentication", "LOGIN_BLOCKED", "Login blocked for inactive account", "BLOCKED", context);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is inactive. Please contact an administrator.");
        }

        if (user.getLockedAt() != null) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(user));
            context.put("reason", "LOCKED");
            context.put("loginAttempts", user.getLoginAttempts());
            activityRecorder.recordForUser(user, "Authentication", "LOGIN_BLOCKED", "Login blocked for locked account", "BLOCKED", context);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is locked. Please contact an administrator.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, password));
            if (!authentication.isAuthenticated()) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
            }
        } catch (BadCredentialsException ex) {
            FailedLoginAttempt failure = registerFailedLogin(user);
            if (failure.locked()) {
                throw new ApiException(HttpStatus.FORBIDDEN,
                        "Your account has been locked after too many failed attempts. Please contact an administrator.", ex);
            }
            String message = buildRemainingAttemptsMessage(failure.attemptsRemaining());
            throw new ApiException(HttpStatus.UNAUTHORIZED, message, ex);
        } catch (LockedException ex) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(user));
            context.put("reason", "LOCKED");
            context.put("loginAttempts", user != null ? user.getLoginAttempts() : null);
            activityRecorder.recordForUser(user, "Authentication", "LOGIN_BLOCKED", "Login blocked for locked account", "BLOCKED", context);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is locked. Please contact an administrator.", ex);
        } catch (DisabledException ex) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(user));
            context.put("reason", "INACTIVE");
            activityRecorder.recordForUser(user, "Authentication", "LOGIN_BLOCKED", "Login blocked for inactive account", "BLOCKED", context);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is inactive. Please contact an administrator.", ex);
        }

        resetLoginState(user);

        if (user.getEmailVerifiedAt() == null) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(user));
            context.put("reason", "UNVERIFIED");
            context.put("loginAttempts", user.getLoginAttempts());
            activityRecorder.recordForUser(user, "Authentication", "LOGIN_BLOCKED", "Login blocked for unverified account", "BLOCKED", context);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account has not been verified yet. Please check your email for the verification link.");
        }

        User detailed = userRepository.findDetailedById(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (detailed.getRoles().isEmpty() && detailed.getDirectPermissions().isEmpty()) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(detailed));
            context.put("reason", "NO_ROLES");
            context.put("loginAttempts", detailed.getLoginAttempts());
            activityRecorder.recordForUser(detailed, "Authentication", "LOGIN_BLOCKED", "Login blocked for user without assigned roles", "BLOCKED", context);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account has not been assigned any roles yet. Please contact an administrator.");
        }

        enforcePortalAccess(detailed);

        String refreshTokenValue = createRefreshToken(detailed);
        AuthResult result = new AuthResult(detailed, refreshTokenValue);
        activityRecorder.recordForUser(detailed, "Authentication", "LOGIN", "User logged in", "SUCCESS", buildAuthContext(detailed));
        return result;
    }

    @Transactional
    protected AuthResult refreshInternal(String refreshToken) {
        RefreshToken token = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        if (token.isRevoked() || token.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked");
        }
        token.setRevoked(true);
        refreshTokenRepository.save(token);
        User user = userRepository.findDetailedById(token.getUser().getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        enforcePortalAccess(user);
        String newRefresh = createRefreshToken(user);
        activityRecorder.recordForUser(user, "Authentication", "TOKEN_REFRESH", "Refreshed access token", "SUCCESS", buildAuthContext(user));
        return new AuthResult(user, newRefresh);
    }

    @Transactional
    protected void logoutInternal(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            activityRecorder.recordForUser(token.getUser(), "Authentication", "LOGOUT", "User logged out", "SUCCESS", buildLogoutContext(token));
        });
    }

    @Transactional
    protected UserDto currentUserInternal(User user) {
        User detailed = userRepository.findDetailedById(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return userMapper.toDto(detailed);
    }

    protected boolean hasRole(User user, String roleKey) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return false;
        }
        String normalized = roleKey == null ? null : roleKey.trim().toUpperCase();
        if (normalized == null || normalized.isEmpty()) {
            return false;
        }
        return user.getRoles().stream()
                .map(role -> role.getKey() == null ? null : role.getKey().trim().toUpperCase())
                .anyMatch(key -> key != null && key.equals(normalized));
    }

    protected com.example.rbac.admin.users.repository.UserRepository getUserRepository() {
        return userRepository;
    }

    protected PasswordEncoder getPasswordEncoder() {
        return passwordEncoder;
    }

    protected AuthResponse buildAuthResponse(User user, String refreshTokenValue) {
        String accessToken = jwtService.generateAccessToken(user);
        UserDto userDto = userMapper.toDto(user);
        AuthResponse response = new AuthResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshTokenValue);
        response.setUser(userDto);
        response.setRoles(userDto.getRoles());
        response.setPermissions(userDto.getPermissions());
        response.setDirectPermissions(userDto.getDirectPermissions());
        response.setRevokedPermissions(userDto.getRevokedPermissions());
        response.setTheme(settingsService.getTheme());
        return response;
    }

    protected ActivityRecorder getActivityRecorder() {
        return activityRecorder;
    }

    protected Map<String, Object> buildAuthContext(User user) {
        HashMap<String, Object> context = new HashMap<>();
        if (user == null) {
            return context;
        }
        if (user.getId() != null) {
            context.put("userId", user.getId());
        }
        if (user.getEmail() != null) {
            context.put("email", user.getEmail());
        }
        context.put("active", user.isActive());
        return context;
    }

    protected AuthResult issueTokens(User user) {
        String refreshToken = createRefreshToken(user);
        return new AuthResult(user, refreshToken);
    }

    private String createRefreshToken(User user) {
        DataIntegrityViolationException lastViolation = null;
        for (int attempt = 0; attempt < 5; attempt++) {
            String tokenValue = jwtService.generateRefreshToken(user);
            RefreshToken refreshToken = new RefreshToken();
            refreshToken.setToken(tokenValue);
            refreshToken.setUser(user);
            refreshToken.setExpiresAt(jwtService.calculateRefreshExpiry());
            try {
                refreshTokenRepository.saveAndFlush(refreshToken);
                return tokenValue;
            } catch (DataIntegrityViolationException ex) {
                lastViolation = ex;
                if (!isDuplicateRefreshTokenViolation(ex)) {
                    throw ex;
                }
            }
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to issue refresh token", lastViolation);
    }

    private boolean isDuplicateRefreshTokenViolation(DataIntegrityViolationException ex) {
        Throwable cause = ex;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException violation) {
                String constraintName = Optional.ofNullable(violation.getConstraintName()).orElse("");
                if (constraintName.contains("refresh_tokens") && constraintName.contains("token")) {
                    return true;
                }
            }
            String message = cause.getMessage();
            if (message != null && message.contains("refresh_tokens") && message.contains("token") && message.contains("Duplicate")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private FailedLoginAttempt registerFailedLogin(User user) {
        if (user == null) {
            return new FailedLoginAttempt(false, 0, MAX_FAILED_LOGIN_ATTEMPTS);
        }
        User managed = userRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (managed.getLockedAt() != null) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(managed));
            context.put("loginAttempts", managed.getLoginAttempts());
            context.put("locked", true);
            activityRecorder.recordForUser(managed, "Authentication", "LOGIN_FAILED", "Attempted sign-in while account is locked", "LOCKED", context);
            user.setLoginAttempts(managed.getLoginAttempts());
            user.setLockedAt(managed.getLockedAt());
            return new FailedLoginAttempt(true, managed.getLoginAttempts(), 0);
        }
        int attempts = managed.getLoginAttempts() + 1;
        managed.setLoginAttempts(attempts);
        boolean locked = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;
        if (locked) {
            managed.setLockedAt(Instant.now());
        }
        userRepository.saveAndFlush(managed);
        user.setLoginAttempts(managed.getLoginAttempts());
        user.setLockedAt(managed.getLockedAt());
        HashMap<String, Object> context = new HashMap<>(buildAuthContext(managed));
        context.put("loginAttempts", managed.getLoginAttempts());
        int attemptsRemaining = Math.max(MAX_FAILED_LOGIN_ATTEMPTS - managed.getLoginAttempts(), 0);
        context.put("attemptsRemaining", attemptsRemaining);
        if (locked) {
            context.put("locked", true);
            activityRecorder.recordForUser(managed, "Authentication", "LOGIN_FAILED", "Account locked after failed sign-in attempt", "LOCKED", context);
        } else {
            activityRecorder.recordForUser(managed, "Authentication", "LOGIN_FAILED", "Failed sign-in attempt", "FAILURE", context);
        }
        return new FailedLoginAttempt(locked, managed.getLoginAttempts(), attemptsRemaining);
    }

    private String buildRemainingAttemptsMessage(int attemptsRemaining) {
        if (attemptsRemaining <= 0) {
            return "Invalid credentials.";
        }
        String attemptLabel = attemptsRemaining == 1 ? "attempt" : "attempts";
        return String.format("Invalid credentials. You have %d %s remaining before your account is locked.",
                attemptsRemaining,
                attemptLabel);
    }

    private record FailedLoginAttempt(boolean locked, int attempts, int attemptsRemaining) {
    }

    private void resetLoginState(User user) {
        if (user == null) {
            return;
        }
        User managed = userRepository.findByIdForUpdate(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        boolean changed = false;
        if (managed.getLoginAttempts() != 0) {
            managed.setLoginAttempts(0);
            changed = true;
        }
        if (managed.getLockedAt() != null) {
            managed.setLockedAt(null);
            changed = true;
        }
        if (changed) {
            userRepository.saveAndFlush(managed);
        }
        user.setLoginAttempts(managed.getLoginAttempts());
        user.setLockedAt(managed.getLockedAt());
    }

    private Map<String, Object> buildLogoutContext(RefreshToken token) {
        HashMap<String, Object> context = new HashMap<>();
        if (token.getId() != null) {
            context.put("refreshTokenId", token.getId());
        }
        if (token.getUser() != null && token.getUser().getId() != null) {
            context.put("userId", token.getUser().getId());
        }
        return context;
    }

    protected record AuthResult(User user, String refreshToken) {
    }
}
