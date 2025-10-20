package com.example.rbac.admin.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public class UpdateUserRequest {
    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    private boolean active = true;

    @Size(min = 8)
    private String password;

    private Set<Long> roleIds;

    private Set<String> permissionKeys;

    private Set<String> revokedPermissionKeys;

    private String phoneNumber;

    private String whatsappNumber;

    private String facebookUrl;

    private String linkedinUrl;

    private String skypeId;

    private String emailSignature;

    private String profileImageUrl;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Set<Long> getRoleIds() {
        return roleIds;
    }

    public void setRoleIds(Set<Long> roleIds) {
        this.roleIds = roleIds;
    }

    public Set<String> getPermissionKeys() {
        return permissionKeys;
    }

    public void setPermissionKeys(Set<String> permissionKeys) {
        this.permissionKeys = permissionKeys;
    }

    public Set<String> getRevokedPermissionKeys() {
        return revokedPermissionKeys;
    }

    public void setRevokedPermissionKeys(Set<String> revokedPermissionKeys) {
        this.revokedPermissionKeys = revokedPermissionKeys;
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

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }
}
