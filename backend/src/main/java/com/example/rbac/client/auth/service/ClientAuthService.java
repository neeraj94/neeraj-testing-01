package com.example.rbac.client.auth.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.permissions.model.Permission;
import com.example.rbac.admin.permissions.repository.PermissionRepository;
import com.example.rbac.admin.roles.model.Role;
import com.example.rbac.admin.roles.repository.RoleRepository;
import com.example.rbac.admin.settings.service.SettingsService;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.mapper.UserMapper;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.repository.UserRepository;
import com.example.rbac.admin.users.service.UserVerificationService;
import com.example.rbac.client.auth.dto.LoginRequest;
import com.example.rbac.client.auth.dto.RefreshTokenRequest;
import com.example.rbac.client.auth.dto.SignupRequest;
import com.example.rbac.client.auth.dto.SignupResponse;
import com.example.rbac.client.auth.dto.VerificationRequest;
import com.example.rbac.client.auth.dto.VerificationResponse;
import com.example.rbac.common.auth.dto.AuthResponse;
import com.example.rbac.common.auth.token.RefreshTokenRepository;
import com.example.rbac.common.auth.service.BaseAuthService;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.common.security.DefaultUserPermissions;
import com.example.rbac.config.JwtService;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

@Service
public class ClientAuthService extends BaseAuthService {

    private static final String CUSTOMER_ROLE_NAME = "Customer";

    private final UserVerificationService userVerificationService;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public ClientAuthService(UserRepository userRepository,
                             RefreshTokenRepository refreshTokenRepository,
                             PasswordEncoder passwordEncoder,
                             AuthenticationManager authenticationManager,
                             JwtService jwtService,
                             UserMapper userMapper,
                             SettingsService settingsService,
                             ActivityRecorder activityRecorder,
                             UserVerificationService userVerificationService,
                             RoleRepository roleRepository,
                             PermissionRepository permissionRepository) {
        super(userRepository, refreshTokenRepository, passwordEncoder, authenticationManager, jwtService, userMapper, settingsService, activityRecorder);
        this.userVerificationService = userVerificationService;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    @PostConstruct
    public void ensureCustomerRoleInitialized() {
        ensureCustomerRole();
    }

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        String email = Optional.ofNullable(request.getEmail()).orElse("").trim();
        getUserRepository().findByEmail(email).ifPresent(existing -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        });

        User user = new User();
        String firstName = Optional.ofNullable(request.getFirstName()).orElse("").trim();
        String lastName = Optional.ofNullable(request.getLastName()).orElse("").trim();
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setFullName(buildFullName(firstName, lastName));
        user.setPasswordHash(getPasswordEncoder().encode(request.getPassword()));
        user.setEmailVerifiedAt(null);

        Role customerRole = ensureCustomerRole();
        user.getRoles().add(customerRole);
        user = getUserRepository().save(user);
        user = getUserRepository().findDetailedById(user.getId()).orElseThrow();
        getActivityRecorder().recordForUser(user, "Authentication", "SIGNUP", "User registered", "SUCCESS", buildAuthContext(user));
        userVerificationService.initiateVerification(user);
        return new SignupResponse(true, "User registered successfully. Verification required.", user.getEmail());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        AuthResult result = loginInternal(request.getEmail(), request.getPassword(), false);
        return buildAuthResponse(result.user(), result.refreshToken());
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        AuthResult result = refreshInternal(request.getRefreshToken());
        return buildAuthResponse(result.user(), result.refreshToken());
    }

    @Transactional
    public void logout(RefreshTokenRequest request) {
        logoutInternal(request.getRefreshToken());
    }

    @Transactional
    public VerificationResponse verifyEmail(VerificationRequest request) {
        UserVerificationService.VerificationResult result = userVerificationService.verifyToken(request.getToken());
        return new VerificationResponse(result.isSuccess(), result.getMessage(), result.isWelcomeEmailSent(), result.getEmail());
    }

    @Transactional
    public UserDto currentUser(User user) {
        return currentUserInternal(user);
    }

    @Override
    protected void enforcePortalAccess(User user) {
        if (!hasRole(user, CUSTOMER_ROLE_KEY)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access restricted. Please use the Admin login portal.");
        }
    }

    private Role ensureCustomerRole() {
        return roleRepository.findByKey(CUSTOMER_ROLE_KEY)
                .orElseGet(this::createCustomerRole);
    }

    private Role createCustomerRole() {
        Role role = new Role();
        role.setKey(CUSTOMER_ROLE_KEY);
        role.setName(CUSTOMER_ROLE_NAME);
        Set<String> defaults = new LinkedHashSet<>(DefaultUserPermissions.getCustomerPermissions());
        Set<Permission> permissions = new HashSet<>(permissionRepository.findByKeyIn(defaults));
        LinkedHashSet<String> missing = new LinkedHashSet<>(defaults);
        permissions.stream()
                .map(Permission::getKey)
                .map(key -> key == null ? null : key.trim().toUpperCase())
                .forEach(missing::remove);
        if (!missing.isEmpty()) {
            for (String key : missing) {
                Permission permission = new Permission();
                permission.setKey(key);
                permission.setName(buildPermissionName(key));
                permissions.add(permissionRepository.save(permission));
            }
        }
        role.setPermissions(permissions);
        return roleRepository.save(role);
    }

    private String buildPermissionName(String key) {
        if (!StringUtils.hasText(key)) {
            return "Customer Permission";
        }
        String normalized = key.trim().toLowerCase().replace('_', ' ');
        String[] parts = normalized.split(" ");
        StringBuilder builder = new StringBuilder();
        for (String part : parts) {
            if (part.isBlank()) {
                continue;
            }
            builder.append(Character.toUpperCase(part.charAt(0)))
                    .append(part.substring(1));
            builder.append(' ');
        }
        String result = builder.toString().trim();
        if (result.isEmpty()) {
            return "Customer Permission";
        }
        return result;
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
