<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/auth/dto/RefreshTokenRequest.java
package com.example.rbac.client.auth.dto;
========
package com.example.rbac.admin.auth.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/auth/dto/RefreshTokenRequest.java

import jakarta.validation.constraints.NotBlank;

public class RefreshTokenRequest {

    @NotBlank
    private String refreshToken;

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }
}
