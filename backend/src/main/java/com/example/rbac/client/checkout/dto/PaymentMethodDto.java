<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/checkout/dto/PaymentMethodDto.java
package com.example.rbac.client.checkout.dto;
========
package com.example.rbac.admin.checkout.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/checkout/dto/PaymentMethodDto.java

public class PaymentMethodDto {

    private String key;
    private String displayName;
    private boolean enabled;
    private String notes;

    public String getKey() {
        return key;
    }

    public void setKey(String key) {
        this.key = key;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
