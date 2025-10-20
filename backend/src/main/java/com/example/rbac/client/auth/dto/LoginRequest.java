<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/auth/dto/LoginRequest.java
package com.example.rbac.client.auth.dto;
========
package com.example.rbac.admin.auth.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/auth/dto/LoginRequest.java

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String password;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
