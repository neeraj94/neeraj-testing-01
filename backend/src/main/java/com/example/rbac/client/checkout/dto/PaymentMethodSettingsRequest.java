<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/checkout/dto/PaymentMethodSettingsRequest.java
package com.example.rbac.client.checkout.dto;
========
package com.example.rbac.admin.checkout.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/checkout/dto/PaymentMethodSettingsRequest.java

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
