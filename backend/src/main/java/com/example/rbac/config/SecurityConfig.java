package com.example.rbac.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.http.HttpMethod;
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

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**", "/api/v1/settings/theme", "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/blog/public/**", "/api/v1/blog/media/**", "/api/v1/public/catalog/**", "/api/v1/brands/assets/**", "/api/v1/categories/assets/**", "/api/v1/badge-categories/assets/**", "/api/v1/badges/assets/**", "/api/v1/products/assets/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/uploaded-files/**").hasAnyAuthority("UPLOADED_FILE_VIEW", "UPLOADED_FILE_MANAGE")
                        .requestMatchers(HttpMethod.GET, "/api/v1/tax-rates/**").hasAuthority("TAX_RATE_VIEW")
                        .requestMatchers(HttpMethod.GET, "/api/v1/shipping/countries/**", "/api/v1/shipping/states/**", "/api/v1/shipping/cities/**").hasAnyAuthority("SHIPPING_AREA_VIEW", "SHIPPING_LOCATION_MANAGE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/shipping/countries/**", "/api/v1/shipping/states/**", "/api/v1/shipping/cities/**").hasAuthority("SHIPPING_LOCATION_MANAGE")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/shipping/countries/**", "/api/v1/shipping/states/**", "/api/v1/shipping/cities/**").hasAuthority("SHIPPING_LOCATION_MANAGE")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/shipping/countries/**", "/api/v1/shipping/states/**", "/api/v1/shipping/cities/**").hasAuthority("SHIPPING_LOCATION_MANAGE")
                        .requestMatchers(HttpMethod.GET, "/api/v1/shipping/area-rates/**").hasAuthority("SHIPPING_AREA_VIEW")
                        .requestMatchers(HttpMethod.POST, "/api/v1/shipping/area-rates/**").hasAuthority("SHIPPING_AREA_CREATE")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/shipping/area-rates/**").hasAuthority("SHIPPING_AREA_UPDATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/shipping/area-rates/**").hasAuthority("SHIPPING_AREA_UPDATE")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/shipping/area-rates/**").hasAuthority("SHIPPING_AREA_DELETE")
                        .requestMatchers(HttpMethod.POST, "/api/v1/tax-rates/**").hasAuthority("TAX_RATE_CREATE")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/tax-rates/**").hasAuthority("TAX_RATE_UPDATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/tax-rates/**").hasAuthority("TAX_RATE_UPDATE")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/tax-rates/**").hasAuthority("TAX_RATE_DELETE")
                        .anyRequest().authenticated())
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
