package com.example.rbac.common.security;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class PublicEndpointScanner implements SmartInitializingSingleton {

    private static final String PUBLIC_PACKAGE = "com.example.rbac.publicapi";

    private final List<RequestMappingHandlerMapping> handlerMappings;

    public PublicEndpointScanner(List<RequestMappingHandlerMapping> handlerMappings) {
        this.handlerMappings = handlerMappings;
    }

    @Override
    public void afterSingletonsInstantiated() {
        LinkedHashMap<String, PublicEndpointDefinition> collected = new LinkedHashMap<>();
        for (RequestMappingHandlerMapping handlerMapping : handlerMappings) {
            handlerMapping.getHandlerMethods().forEach((info, method) -> {
                if (info == null || method == null) {
                    return;
                }
                if (!isPublicHandler(method)) {
                    return;
                }
                Set<String> patterns = extractPatterns(info);
                if (patterns.isEmpty()) {
                    return;
                }
                Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
                String description = resolveDescription(method);
                if (methods.isEmpty()) {
                    for (String pattern : patterns) {
                        collected.putIfAbsent(buildKey(null, pattern),
                                new PublicEndpointDefinition(null, pattern, description));
                    }
                } else {
                    for (RequestMethod requestMethod : methods) {
                        HttpMethod httpMethod = HttpMethod.valueOf(requestMethod.name());
                        for (String pattern : patterns) {
                            collected.putIfAbsent(buildKey(httpMethod, pattern),
                                    new PublicEndpointDefinition(httpMethod, pattern, description));
                        }
                    }
                }
            });
        }
        PublicEndpointRegistry.replaceDynamicEndpoints(collected.values());
    }

    private String buildKey(HttpMethod method, String pattern) {
        String methodValue = method != null ? method.name() : "ALL";
        return methodValue + "::" + pattern;
    }

    private boolean isPublicHandler(HandlerMethod handlerMethod) {
        Class<?> beanType = handlerMethod.getBeanType();
        if (beanType == null) {
            return false;
        }
        if (beanType.isAnnotationPresent(PublicEndpoint.class) || handlerMethod.hasMethodAnnotation(PublicEndpoint.class)) {
            return true;
        }
        String packageName = beanType.getPackageName();
        return packageName != null && packageName.startsWith(PUBLIC_PACKAGE);
    }

    private Set<String> extractPatterns(RequestMappingInfo info) {
        Set<String> patterns = new LinkedHashSet<>();
        if (info.getPathPatternsCondition() != null) {
            patterns.addAll(info.getPathPatternsCondition().getPatternValues());
        }
        if (patterns.isEmpty() && info.getPatternsCondition() != null) {
            patterns.addAll(info.getPatternsCondition().getPatterns());
        }
        return patterns;
    }

    private String resolveDescription(HandlerMethod method) {
        PublicEndpoint methodAnnotation = method.getMethodAnnotation(PublicEndpoint.class);
        if (methodAnnotation != null && StringUtils.hasText(methodAnnotation.value())) {
            return methodAnnotation.value();
        }
        PublicEndpoint typeAnnotation = method.getBeanType().getAnnotation(PublicEndpoint.class);
        if (typeAnnotation != null && StringUtils.hasText(typeAnnotation.value())) {
            return typeAnnotation.value();
        }
        return method.getBeanType().getSimpleName() + "#" + method.getMethod().getName();
    }
}
