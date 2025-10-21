package com.example.rbac.client.auth.dto;

public class SignupResponse {

    private boolean verificationRequired;
    private String message;
    private String email;

    public SignupResponse() {
    }

    public SignupResponse(boolean verificationRequired, String message, String email) {
        this.verificationRequired = verificationRequired;
        this.message = message;
        this.email = email;
    }

    public boolean isVerificationRequired() {
        return verificationRequired;
    }

    public void setVerificationRequired(boolean verificationRequired) {
        this.verificationRequired = verificationRequired;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
