package com.super_admin_backend.Config;

 import com.super_admin_backend.Utility.JwtAuthenticationFilter;
import com.super_admin_backend.security.FirebaseAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
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
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final FirebaseAuthFilter firebaseAuthFilter;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(
            FirebaseAuthFilter firebaseAuthFilter,
            JwtAuthenticationFilter jwtAuthenticationFilter
    ) {
        this.firebaseAuthFilter = firebaseAuthFilter;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth

                        // 🌍 FRONTEND + STATIC (PUBLIC)
                        .requestMatchers(
                                "/",
                                "/login",
                                "/index.html",
                                "/static/**",
                                "/assets/**",
                                "/vite.svg",
                                "/favicon.ico",
                                "/**/*.html",
                                "/**/*.js",
                                "/**/*.css",
                                "/**/*.png",
                                "/**/*.jpg",
                                "/**/*.jpeg",
                                "/**/*.svg",
                                "/**/*.woff",
                                "/**/*.woff2",
                                "/**/*.ttf",
                                "/**/*.ico"
                        ).permitAll()

                        // 🔓 PUBLIC APIs (UNCHANGED)
                        .requestMatchers(
                                "/api/auth/**",
                                "/api/staff/auth/**",
                                "/h2-console/**"
                        ).permitAll()

                        // 👑 SUPER ADMIN (Firebase ONLY)
                        .requestMatchers("/api/super-admin/**").authenticated()

                        // 🧑‍💼 BOUTIQUE ADMINS (JWT)
                        .requestMatchers("/api/main-branch-admin/**")
                        .hasRole("MAIN_BRANCH_ADMIN")

                        .requestMatchers("/api/branch-admin/**")
                        .hasRole("BRANCH_ADMIN")

                        // 👷 STAFF (JWT)
                        .requestMatchers("/api/staff/**").authenticated()

                        .anyRequest().permitAll()
                );
        /*
         🔥 FILTER ORDER (SAME SEMANTICS AS BEFORE)
         1. FirebaseAuthFilter → Firebase token validation
         2. JwtAuthenticationFilter → ALL JWT logic (merged)
        */
        http
                .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);


        http.headers(headers -> headers.frameOptions(frame -> frame.disable()));

        return http.build();
    }

    // ✅ CORS (UNCHANGED)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of("http://localhost:8080"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
