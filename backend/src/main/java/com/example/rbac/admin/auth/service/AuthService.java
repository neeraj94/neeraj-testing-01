package com.example.rbac.admin.auth.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.auth.dto.AuthResponse;
import com.example.rbac.admin.auth.dto.LoginRequest;
import com.example.rbac.admin.auth.dto.RefreshTokenRequest;
import com.example.rbac.admin.auth.dto.SignupRequest;
import com.example.rbac.admin.auth.dto.VerificationRequest;
import com.example.rbac.admin.auth.dto.VerificationResponse;
import com.example.rbac.admin.auth.token.RefreshToken;
import com.example.rbac.admin.auth.token.RefreshTokenRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.config.JwtService;
import com.example.rbac.admin.settings.service.SettingsService;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.mapper.UserMapper;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.repository.UserRepository;
import com.example.rbac.admin.users.service.UserVerificationService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;

@Service
public class AuthService {

    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final SettingsService settingsService;
    private final ActivityRecorder activityRecorder;
    private final UserVerificationService userVerificationService;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       UserMapper userMapper,
                       SettingsService settingsService,
                       ActivityRecorder activityRecorder,
                       UserVerificationService userVerificationService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.settingsService = settingsService;
        this.activityRecorder = activityRecorder;
        this.userVerificationService = userVerificationService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim();
        userRepository.findByEmail(email).ifPresent(user -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        });
        User user = new User();
        String firstName = request.getFirstName() == null ? "" : request.getFirstName().trim();
        String lastName = request.getLastName() == null ? "" : request.getLastName().trim();
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setFullName(buildFullName(firstName, lastName));
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmailVerifiedAt(null);
        user = userRepository.save(user);
        user = userRepository.findDetailedById(user.getId()).orElseThrow();
        String refreshTokenValue = createRefreshToken(user);
        AuthResponse response = buildAuthResponse(user, refreshTokenValue);
        activityRecorder.recordForUser(user, "Authentication", "SIGNUP", "User registered", "SUCCESS", buildAuthContext(user));
        userVerificationService.initiateVerification(user);
        return response;
    }

    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
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
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
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

        user = userRepository.findDetailedById(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (user.getRoles().isEmpty() && user.getDirectPermissions().isEmpty()) {
            HashMap<String, Object> context = new HashMap<>(buildAuthContext(user));
            context.put("reason", "NO_ROLES");
            context.put("loginAttempts", user.getLoginAttempts());
            activityRecorder.recordForUser(user, "Authentication", "LOGIN_BLOCKED", "Login blocked for user without assigned roles", "BLOCKED", context);
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account has not been assigned any roles yet. Please contact an administrator.");
        }
        String refreshTokenValue = createRefreshToken(user);
        AuthResponse response = buildAuthResponse(user, refreshTokenValue);
        activityRecorder.recordForUser(user, "Authentication", "LOGIN", "User logged in", "SUCCESS", buildAuthContext(user));
        return response;
    }

    @Transactional
    public VerificationResponse verifyEmail(VerificationRequest request) {
        UserVerificationService.VerificationResult result = userVerificationService.verifyToken(request.getToken());
        return new VerificationResponse(result.isSuccess(), result.getMessage(), result.isWelcomeEmailSent(), result.getEmail());
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        if (refreshToken.isRevoked() || refreshToken.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked");
        }
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);
        User user = userRepository.findDetailedById(refreshToken.getUser().getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        String newRefresh = createRefreshToken(user);
        AuthResponse response = buildAuthResponse(user, newRefresh);
        activityRecorder.recordForUser(user, "Authentication", "TOKEN_REFRESH", "Refreshed access token", "SUCCESS", buildAuthContext(user));
        return response;
    }

    @Transactional
    public void logout(RefreshTokenRequest request) {
        refreshTokenRepository.findByToken(request.getRefreshToken()).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            activityRecorder.recordForUser(token.getUser(), "Authentication", "LOGOUT", "User logged out", "SUCCESS", buildLogoutContext(token));
        });
    }

    public UserDto currentUser(User user) {
        User detailed = userRepository.findDetailedById(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return userMapper.toDto(detailed);
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

    private AuthResponse buildAuthResponse(User user, String refreshTokenValue) {
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

    private Map<String, Object> buildAuthContext(User user) {
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

    private String buildFullName(String firstName, String lastName) {
        StringBuilder builder = new StringBuilder();
        if (StringUtils.hasText(firstName)) {
            builder.append(firstName.trim());
        }
        if (StringUtils.hasText(lastName)) {
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(lastName.trim());
        }
        return builder.length() > 0 ? builder.toString() : null;
    }
}
