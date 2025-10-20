package com.example.rbac.admin.auth.dto;

public class VerificationResponse {

    private boolean success;
    private String message;
    private boolean welcomeEmailSent;
    private String email;

    public VerificationResponse() {
    }

    public VerificationResponse(boolean success, String message, boolean welcomeEmailSent, String email) {
        this.success = success;
        this.message = message;
        this.welcomeEmailSent = welcomeEmailSent;
        this.email = email;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isWelcomeEmailSent() {
        return welcomeEmailSent;
    }

    public void setWelcomeEmailSent(boolean welcomeEmailSent) {
        this.welcomeEmailSent = welcomeEmailSent;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
