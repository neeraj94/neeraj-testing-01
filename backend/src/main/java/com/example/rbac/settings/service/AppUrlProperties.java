package com.example.rbac.settings.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.urls")
public class AppUrlProperties {

    private String login = "http://localhost:3000/login";
    private String verification = "http://localhost:8080/api/v1/auth/verify";

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public String getVerification() {
        return verification;
    }

    public void setVerification(String verification) {
        this.verification = verification;
    }
}
