package com.example.rbac.checkout.dto;

public class PaymentMethodSettingsRequest {

    private Boolean enabled;
    private String notes;

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
