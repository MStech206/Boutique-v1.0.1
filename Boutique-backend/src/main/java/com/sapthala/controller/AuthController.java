package com.sapthala.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Date;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @PostMapping("/exchange")
    public ResponseEntity<Map<String, Object>> exchangeToken(@RequestBody Map<String, String> body) throws FirebaseAuthException {
        String idToken = body.get("idToken");
        if (idToken == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "idToken required"));
        }

        FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(idToken);
        String uid = decoded.getUid();

        // Extract roles from custom claims if present
        Object rolesObj = decoded.getClaims().get("roles");

        // Issue server JWT (short-lived). Use JWT_SECRET env var.
        String secret = System.getenv("JWT_SECRET");
        if (secret == null) secret = "replace_me_in_env"; // **REPLACE** in prod

        Instant now = Instant.now();
        Date expiry = Date.from(now.plusSeconds(3600));

        String jwt = Jwts.builder()
                .subject(uid)
                .claim("roles", rolesObj)
                .issuedAt(Date.from(now))
                .expiration(expiry)
                .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .compact();

        return ResponseEntity.ok(Map.of(
                "jwt", jwt,
                "expiresAt", expiry.getTime(),
                "uid", uid,
                "roles", rolesObj
        ));
    }
}
