package com.example.rbac.config;

import com.example.rbac.common.security.DefaultUserPermissions;
import com.example.rbac.admin.users.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey key;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.key = Keys.hmacShaKeyFor(properties.getSecret().getBytes());
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.getAccessTokenTtlSeconds());
        return Jwts.builder()
                .setSubject(user.getId().toString())
                .addClaims(Map.of(
                        "email", user.getEmail(),
                        "roles", extractRoleKeys(user),
                        "permissions", extractPermissions(user)
                ))
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.getRefreshTokenTtlSeconds());
        return Jwts.builder()
                .setId(UUID.randomUUID().toString())
                .setSubject(user.getId().toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Instant calculateRefreshExpiry() {
        return Instant.now().plusSeconds(properties.getRefreshTokenTtlSeconds());
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Set<String> extractRoleKeys(User user) {
        return user.getRoles().stream()
                .map(role -> role.getKey())
                .collect(Collectors.toSet());
    }

    private Set<String> extractPermissions(User user) {
        return user.getRoles().stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(perm -> perm.getKey())
                .collect(Collectors.collectingAndThen(Collectors.toSet(), permissions -> {
                    permissions.addAll(user.getDirectPermissions().stream()
                            .map(permission -> permission.getKey())
                            .collect(Collectors.toSet()));
                    Set<String> revoked = user.getRevokedPermissions().stream()
                            .map(permission -> permission.getKey())
                            .collect(Collectors.toSet());
                    permissions.removeAll(revoked);
                    if (hasCustomerRole(user)) {
                        permissions.addAll(DefaultUserPermissions.getCustomerPermissions());
                    }
                    return permissions;
                }));
    }

    private boolean hasCustomerRole(User user) {
        return user.getRoles().stream()
                .anyMatch(role -> role.getKey() != null && role.getKey().equalsIgnoreCase("CUSTOMER"));
    }
}
