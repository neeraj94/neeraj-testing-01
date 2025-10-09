package com.example.rbac.settings.dto;

public class EmailTestResponse {

    private String message;

    public EmailTestResponse() {
    }

    public EmailTestResponse(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
