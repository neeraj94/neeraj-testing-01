package com.example.rbac.auth;

import com.example.rbac.auth.dto.AuthResponse;
import com.example.rbac.auth.dto.LoginRequest;
import com.example.rbac.users.dto.UserDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void superAdminCanLoginAndAccessProtectedResources() {
        LoginRequest request = new LoginRequest();
        request.setEmail("superadmin@demo.io");
        request.setPassword("Super@123");

        ResponseEntity<AuthResponse> loginResponse = restTemplate.postForEntity(
                baseUrl("/auth/login"),
                request,
                AuthResponse.class
        );

        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        AuthResponse body = loginResponse.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getAccessToken()).isNotBlank();
        assertThat(body.getRoles()).contains("SUPER_ADMIN");
        assertThat(body.getPermissions()).contains("CUSTOMER_VIEW", "USER_VIEW");

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(body.getAccessToken());

        ResponseEntity<UserDto> currentUserResponse = restTemplate.exchange(
                baseUrl("/auth/me"),
                HttpMethod.GET,
                new HttpEntity<>(headers),
                UserDto.class
        );

        assertThat(currentUserResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(currentUserResponse.getBody()).isNotNull();

        ResponseEntity<String> customersResponse = restTemplate.exchange(
                baseUrl("/customers"),
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );

        assertThat(customersResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    private String baseUrl(String path) {
        return "http://localhost:" + port + "/api/v1" + path;
    }
}
