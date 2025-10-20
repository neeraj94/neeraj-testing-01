package com.example.rbac.config;

import com.example.rbac.common.security.PublicEndpointDefinition;
import com.example.rbac.common.security.PublicEndpointRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    private static final String[] UPLOADED_FILE_BROWSE_AUTHORITIES = {
            "UPLOADED_FILE_VIEW",
            "UPLOADED_FILE_MANAGE",
            "PRODUCT_VIEW",
            "PRODUCT_CREATE",
            "PRODUCT_UPDATE",
            "BRAND_VIEW",
            "BRAND_CREATE",
            "BRAND_UPDATE",
            "CATEGORY_VIEW",
            "CATEGORY_CREATE",
            "CATEGORY_UPDATE",
            "BADGE_VIEW",
            "BADGE_CREATE",
            "BADGE_UPDATE",
            "BADGE_CATEGORY_VIEW",
            "BADGE_CATEGORY_CREATE",
            "BADGE_CATEGORY_UPDATE",
            "BLOG_POST_VIEW",
            "BLOG_POST_CREATE",
            "BLOG_POST_UPDATE",
            "WEDGE_VIEW",
            "WEDGE_CREATE",
            "WEDGE_UPDATE"
    };

    private static final String[] UPLOADED_FILE_UPLOAD_AUTHORITIES = {
            "UPLOADED_FILE_MANAGE",
            "PRODUCT_CREATE",
            "PRODUCT_UPDATE",
            "BRAND_CREATE",
            "BRAND_UPDATE",
            "CATEGORY_CREATE",
            "CATEGORY_UPDATE",
            "BADGE_CREATE",
            "BADGE_UPDATE",
            "BADGE_CATEGORY_CREATE",
            "BADGE_CATEGORY_UPDATE",
            "BLOG_POST_CREATE",
            "BLOG_POST_UPDATE",
            "WEDGE_CREATE",
            "WEDGE_UPDATE"
    };

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    for (PublicEndpointDefinition endpoint : PublicEndpointRegistry.getEndpoints()) {
                        if (endpoint.matchesAllMethods()) {
                            auth.requestMatchers(endpoint.pattern()).permitAll();
                        } else {
                            auth.requestMatchers(endpoint.method(), endpoint.pattern()).permitAll();
                        }
                    }
                    auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/uploaded-files/**").hasAnyAuthority("UPLOADED_FILE_VIEW", "UPLOADED_FILE_MANAGE", "COUPON_VIEW_GLOBAL", "COUPON_CREATE", "COUPON_UPDATE")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_VIEW")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/shipping/countries/**", "/api/v1/admin/shipping/states/**", "/api/v1/admin/shipping/cities/**").hasAnyAuthority("SHIPPING_VIEW", "SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/shipping/countries/**", "/api/v1/admin/shipping/states/**", "/api/v1/admin/shipping/cities/**").hasAuthority("SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/admin/shipping/countries/**", "/api/v1/admin/shipping/states/**", "/api/v1/admin/shipping/cities/**").hasAuthority("SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/shipping/countries/**", "/api/v1/admin/shipping/states/**", "/api/v1/admin/shipping/cities/**").hasAuthority("SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.GET, "/api/v1/admin/shipping/area-rates/**").hasAnyAuthority("SHIPPING_VIEW", "SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_CREATE")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_UPDATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_UPDATE")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_DELETE")
                        .anyRequest().authenticated();
                })
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
