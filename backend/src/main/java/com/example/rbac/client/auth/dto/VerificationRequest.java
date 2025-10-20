<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/auth/dto/VerificationRequest.java
package com.example.rbac.client.auth.dto;
========
package com.example.rbac.admin.auth.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/auth/dto/VerificationRequest.java

import jakarta.validation.constraints.NotBlank;

public class VerificationRequest {

    @NotBlank
    private String token;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }
}
