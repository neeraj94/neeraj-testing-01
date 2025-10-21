package com.example.rbac.config;

import com.example.rbac.common.security.DynamicPublicEndpointMatcher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

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

    private static final String[] SHIPPING_LOCATION_READ_AUTHORITIES = {
            "SHIPPING_VIEW",
            "SHIPPING_MANAGE",
            "USER_VIEW",
            "USER_VIEW_GLOBAL",
            "USER_CREATE",
            "USER_UPDATE",
            "USER_DELETE",
            "ORDER_VIEW_GLOBAL",
            "ORDER_CREATE",
            "ORDER_UPDATE"
    };

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                    auth.requestMatchers(new DynamicPublicEndpointMatcher()).permitAll();

                    auth.requestMatchers("/api/v1/public/**", "/api/v1/client/public/**", "/api/public/endpoints").permitAll()
                            .requestMatchers("/api/v1/client/auth/signup", "/api/v1/client/auth/login").permitAll()
                            .requestMatchers("/api/v1/admin/auth/**").permitAll()
                            .requestMatchers(HttpMethod.GET, "/api/v1/admin/uploaded-files/**").hasAnyAuthority(
                                    "UPLOADED_FILE_VIEW",
                                    "UPLOADED_FILE_MANAGE",
                                    "COUPON_VIEW_GLOBAL",
                                    "COUPON_CREATE",
                                    "COUPON_UPDATE")
                            .requestMatchers(HttpMethod.GET, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_VIEW")
                            .requestMatchers(HttpMethod.GET, "/api/v1/admin/shipping/countries/**",
                                    "/api/v1/admin/shipping/states/**",
                                    "/api/v1/admin/shipping/cities/**").hasAnyAuthority(SHIPPING_LOCATION_READ_AUTHORITIES)
                            .requestMatchers(HttpMethod.POST, "/api/v1/admin/shipping/countries/**",
                                    "/api/v1/admin/shipping/states/**",
                                    "/api/v1/admin/shipping/cities/**").hasAuthority("SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.PUT, "/api/v1/admin/shipping/countries/**",
                                    "/api/v1/admin/shipping/states/**",
                                    "/api/v1/admin/shipping/cities/**").hasAuthority("SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/shipping/countries/**",
                                    "/api/v1/admin/shipping/states/**",
                                    "/api/v1/admin/shipping/cities/**").hasAuthority("SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.GET, "/api/v1/admin/shipping/area-rates/**").hasAnyAuthority("SHIPPING_VIEW", "SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.POST, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.PUT, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/shipping/area-rates/**").hasAuthority("SHIPPING_MANAGE")
                            .requestMatchers(HttpMethod.POST, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_CREATE")
                            .requestMatchers(HttpMethod.PUT, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_UPDATE")
                            .requestMatchers(HttpMethod.PATCH, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_UPDATE")
                            .requestMatchers(HttpMethod.DELETE, "/api/v1/admin/tax-rates/**").hasAuthority("TAX_RATE_DELETE")
                            .requestMatchers("/api/v1/client/**").hasRole("CUSTOMER")
                            .requestMatchers("/api/v1/admin/**").access((authentication, context) -> {
                                boolean isCustomer = authentication.get().getAuthorities().stream()
                                        .anyMatch(authority -> authority.getAuthority().equals("ROLE_CUSTOMER"));
                                return new AuthorizationDecision(!isCustomer);
                            })
                            .anyRequest().denyAll();
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

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://127.0.0.1:5173", "http://localhost:5173"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
