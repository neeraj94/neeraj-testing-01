package com.example.rbac.admin.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AdminWebConfig implements WebMvcConfigurer {

    private static final String ADMIN_BASE_PACKAGE = "com.example.rbac.admin";
    private static final String CONFIG_PACKAGE = ADMIN_BASE_PACKAGE + ".config";

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix("/api/v1/admin", handlerType -> {
            String packageName = handlerType.getPackageName();
            return packageName.startsWith(ADMIN_BASE_PACKAGE)
                    && !packageName.startsWith(CONFIG_PACKAGE);
        });
    }
}
