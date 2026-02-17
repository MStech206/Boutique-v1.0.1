package com.sapthala.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UsersController {

    @PostMapping("/{uid}/fcm-token")
    public ResponseEntity<Map<String, Object>> registerFcmToken(@PathVariable String uid,
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = (String) body.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "token required"));
        }

        // Simple auth check: ensure JWT subject matches uid OR caller has ADMIN role
        Object jwtClaims = request.getAttribute("jwtClaims");
        if (jwtClaims == null) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }
        Map<?, ?> claimsMap = (Map<?, ?>) jwtClaims;
        Object sub = claimsMap.get("sub");
        Object rolesClaim = claimsMap.get("roles");
        boolean allowed = false;
        if (sub != null && sub.toString().equals(uid))
            allowed = true;
        if (rolesClaim != null && rolesClaim.toString().toLowerCase().contains("admin"))
            allowed = true;
        if (!allowed)
            return ResponseEntity.status(403).body(Map.of("error", "forbidden"));

        try {
            com.google.cloud.firestore.Firestore db = com.google.firebase.cloud.FirestoreClient.getFirestore();
            db.collection("users").document(uid)
                    .set(Map.of("fcmToken", token), com.google.cloud.firestore.SetOptions.merge()).get();
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "failed_to_register", "detail", e.getMessage()));
        }
    }
}
