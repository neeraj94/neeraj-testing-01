package com.example.rbac.admin.auth.service;

import com.example.rbac.admin.activity.service.ActivityRecorder;
import com.example.rbac.admin.settings.service.SettingsService;
import com.example.rbac.admin.users.dto.UserDto;
import com.example.rbac.admin.users.mapper.UserMapper;
import com.example.rbac.admin.users.model.User;
import com.example.rbac.admin.users.repository.UserRepository;
import com.example.rbac.client.auth.token.RefreshTokenRepository;
import com.example.rbac.common.auth.dto.AuthResponse;
import com.example.rbac.common.auth.service.BaseAuthService;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.config.JwtService;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService extends BaseAuthService {

    public AdminAuthService(UserRepository userRepository,
                            RefreshTokenRepository refreshTokenRepository,
                            PasswordEncoder passwordEncoder,
                            AuthenticationManager authenticationManager,
                            JwtService jwtService,
                            UserMapper userMapper,
                            SettingsService settingsService,
                            ActivityRecorder activityRecorder) {
        super(userRepository, refreshTokenRepository, passwordEncoder, authenticationManager, jwtService, userMapper, settingsService, activityRecorder);
    }

    @Transactional
    public AuthResponse login(String email, String password) {
        AuthResult result = loginInternal(email, password);
        return buildAuthResponse(result.user(), result.refreshToken());
    }

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        AuthResult result = refreshInternal(refreshToken);
        return buildAuthResponse(result.user(), result.refreshToken());
    }

    @Transactional
    public void logout(String refreshToken) {
        logoutInternal(refreshToken);
    }

    @Transactional
    public UserDto currentUser(User user) {
        return currentUserInternal(user);
    }

    @Override
    protected void enforcePortalAccess(User user) {
        if (hasRole(user, CUSTOMER_ROLE_KEY)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Customer accounts are not permitted on the Admin portal.");
        }
    }
}
