package com.example.rbac.client.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ClientWebConfig implements WebMvcConfigurer {

    private static final String CLIENT_BASE_PACKAGE = "com.example.rbac.client";
    private static final String CONFIG_PACKAGE = CLIENT_BASE_PACKAGE + ".config";

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix("/api/v1/client", handlerType -> {
            String packageName = handlerType.getPackageName();
            return packageName.startsWith(CLIENT_BASE_PACKAGE)
                    && !packageName.startsWith(CONFIG_PACKAGE);
        });
    }
}
