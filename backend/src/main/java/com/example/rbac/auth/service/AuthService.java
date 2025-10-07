package com.example.rbac.auth.service;

import com.example.rbac.activity.service.ActivityRecorder;
import com.example.rbac.auth.dto.AuthResponse;
import com.example.rbac.auth.dto.LoginRequest;
import com.example.rbac.auth.dto.RefreshTokenRequest;
import com.example.rbac.auth.dto.SignupRequest;
import com.example.rbac.auth.token.RefreshToken;
import com.example.rbac.auth.token.RefreshTokenRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.config.JwtService;
import com.example.rbac.settings.service.SettingsService;
import com.example.rbac.users.dto.UserDto;
import com.example.rbac.users.mapper.UserMapper;
import com.example.rbac.users.model.User;
import com.example.rbac.users.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
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

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final SettingsService settingsService;
    private final ActivityRecorder activityRecorder;

    public AuthService(UserRepository userRepository,
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
        user = userRepository.save(user);
        user = userRepository.findDetailedById(user.getId()).orElseThrow();
        String refreshTokenValue = createRefreshToken(user);
        AuthResponse response = buildAuthResponse(user, refreshTokenValue);
        activityRecorder.recordForUser(user, "Authentication", "SIGNUP", "User registered", "SUCCESS", buildAuthContext(user));
        return response;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        if (!authentication.isAuthenticated()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        String refreshTokenValue = createRefreshToken(user);
        AuthResponse response = buildAuthResponse(user, refreshTokenValue);
        activityRecorder.recordForUser(user, "Authentication", "LOGIN", "User logged in", "SUCCESS", buildAuthContext(user));
        return response;
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
