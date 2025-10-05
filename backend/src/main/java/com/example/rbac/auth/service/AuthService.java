package com.example.rbac.auth.service;

import com.example.rbac.auth.dto.AuthResponse;
import com.example.rbac.auth.dto.LoginRequest;
import com.example.rbac.auth.dto.RefreshTokenRequest;
import com.example.rbac.auth.dto.SignupRequest;
import com.example.rbac.auth.token.RefreshToken;
import com.example.rbac.auth.token.RefreshTokenRepository;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.config.JwtService;
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

import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       UserMapper userMapper) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already in use");
        });
        User user = new User();
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user = userRepository.save(user);
        user = userRepository.findDetailedById(user.getId()).orElseThrow();
        String refreshTokenValue = createRefreshToken(user);
        return buildAuthResponse(user, refreshTokenValue);
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
        return buildAuthResponse(user, refreshTokenValue);
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
        return buildAuthResponse(user, newRefresh);
    }

    @Transactional
    public void logout(RefreshTokenRequest request) {
        refreshTokenRepository.findByToken(request.getRefreshToken()).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });
    }

    public UserDto currentUser(User user) {
        User detailed = userRepository.findDetailedById(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return userMapper.toDto(detailed);
    }

    private String createRefreshToken(User user) {
        String tokenValue = jwtService.generateRefreshToken(user);
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(tokenValue);
        refreshToken.setUser(user);
        refreshToken.setExpiresAt(jwtService.calculateRefreshExpiry());
        refreshTokenRepository.save(refreshToken);
        return tokenValue;
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
        return response;
    }
}
