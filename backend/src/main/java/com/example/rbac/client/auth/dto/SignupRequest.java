<<<<<<<< HEAD:backend/src/main/java/com/example/rbac/client/auth/dto/SignupRequest.java
package com.example.rbac.client.auth.dto;
========
package com.example.rbac.admin.auth.dto;
>>>>>>>> origin/main:backend/src/main/java/com/example/rbac/admin/auth/dto/SignupRequest.java

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SignupRequest {

    @Email
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 8)
    private String password;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

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
}
