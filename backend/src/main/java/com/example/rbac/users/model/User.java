package com.example.rbac.users.model;

import com.example.rbac.roles.model.Role;
import com.example.rbac.permissions.model.Permission;
import com.example.rbac.auth.token.RefreshToken;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(name = "phone_number", length = 50)
    private String phoneNumber;

    @Column(name = "whatsapp_number", length = 50)
    private String whatsappNumber;

    @Column(name = "facebook_url", length = 255)
    private String facebookUrl;

    @Column(name = "linkedin_url", length = 255)
    private String linkedinUrl;

    @Column(name = "skype_id", length = 100)
    private String skypeId;

    @Column(name = "email_signature")
    private String emailSignature;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @ManyToMany
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "user_permission_overrides",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id"))
    private Set<Permission> directPermissions = new HashSet<>();

    @ManyToMany
    @JoinTable(name = "user_permission_revocations",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id"))
    private Set<Permission> revokedPermissions = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<RefreshToken> refreshTokens = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        refreshFullName();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = Instant.now();
        refreshFullName();
    }

    private void refreshFullName() {
        String first = firstName != null ? firstName.trim() : "";
        String last = lastName != null ? lastName.trim() : "";
        String combined = (first + " " + last).trim();
        if (!combined.isEmpty()) {
            fullName = combined;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getWhatsappNumber() {
        return whatsappNumber;
    }

    public void setWhatsappNumber(String whatsappNumber) {
        this.whatsappNumber = whatsappNumber;
    }

    public String getFacebookUrl() {
        return facebookUrl;
    }

    public void setFacebookUrl(String facebookUrl) {
        this.facebookUrl = facebookUrl;
    }

    public String getLinkedinUrl() {
        return linkedinUrl;
    }

    public void setLinkedinUrl(String linkedinUrl) {
        this.linkedinUrl = linkedinUrl;
    }

    public String getSkypeId() {
        return skypeId;
    }

    public void setSkypeId(String skypeId) {
        this.skypeId = skypeId;
    }

    public String getEmailSignature() {
        return emailSignature;
    }

    public void setEmailSignature(String emailSignature) {
        this.emailSignature = emailSignature;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = roles;
    }

    public Set<Permission> getDirectPermissions() {
        return directPermissions;
    }

    public void setDirectPermissions(Set<Permission> directPermissions) {
        this.directPermissions = directPermissions;
    }

    public Set<Permission> getRevokedPermissions() {
        return revokedPermissions;
    }

    public void setRevokedPermissions(Set<Permission> revokedPermissions) {
        this.revokedPermissions = revokedPermissions;
    }

    public Set<RefreshToken> getRefreshTokens() {
        return refreshTokens;
    }

    public void setRefreshTokens(Set<RefreshToken> refreshTokens) {
        this.refreshTokens = refreshTokens;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
