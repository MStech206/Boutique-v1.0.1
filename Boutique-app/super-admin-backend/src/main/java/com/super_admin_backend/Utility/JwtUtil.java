package com.super_admin_backend.Utility;

import com.super_admin_backend.Entity.Admin;
import com.super_admin_backend.Enums.StaffRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtil {

    // ====== ADMIN JWT ======
    private static final String ADMIN_SECRET_KEY =
            "ADMIN_JWT_SECRET_64_CHARS_LONG_SUPER_SECURE_KEY_1234567890_ADMIN";
    private static final long ADMIN_EXPIRATION =
            1000 * 60 * 30 * 24; // 1 day

    // ====== STAFF JWT ======
    private static final String STAFF_SECRET_KEY =
            "staff-secret-key-that-is-long-enough-for-hmac-256";
    private static final long STAFF_EXPIRATION =
            1000 * 60 * 60 * 24; // 1 day

    // ================= ADMIN TOKEN =================
    public String generateAdminToken(Admin admin) {

        return Jwts.builder()
                .setSubject(admin.getEmail())
                .claim("role", "ROLE_" + admin.getRole().name())
                .claim("userType", "ADMIN")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ADMIN_EXPIRATION))
                .signWith(Keys.hmacShaKeyFor(ADMIN_SECRET_KEY.getBytes()),
                        SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims getAdminClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(ADMIN_SECRET_KEY.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // ================= STAFF TOKEN =================
    public String generateStaffToken(String username, StaffRole role) {

        return Jwts.builder()
                .setSubject(username)
                .claim("role", role.name())
                .claim("userType", "STAFF")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + STAFF_EXPIRATION))
                .signWith(Keys.hmacShaKeyFor(STAFF_SECRET_KEY.getBytes()),
                        SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims getStaffClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(STAFF_SECRET_KEY.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
