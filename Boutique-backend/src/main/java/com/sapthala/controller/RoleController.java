package com.sapthala.controller;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin/users")
public class RoleController {

    // Endpoint to set custom claims (Admin only — ensure request has valid Admin
    // JWT)
    @PostMapping("/{uid}/roles")
    public ResponseEntity<Map<String, String>> setRoles(@PathVariable String uid, @RequestBody Map<String, Object> body,
            HttpServletRequest request) throws FirebaseAuthException {
        // Simple guard: ensure the server JWT contains 'roles' with ADMIN (enforce more
        // robust checks in production)
        Object jwtClaims = request.getAttribute("jwtClaims");
        if (jwtClaims == null) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }

        // Basic check (expects roles as list) — improve for production
        Map<?, ?> claimsMap = (Map<?, ?>) jwtClaims;
        Object rolesClaim = claimsMap.get("roles");
        if (rolesClaim == null || !rolesClaim.toString().contains("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("error", "forbidden - admin role required"));
        }

        Object roles = body.get("roles");
        if (roles == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "roles required"));
        }

        UserRecord.UpdateRequest updateRequest = new UserRecord.UpdateRequest(uid)
                .setCustomClaims(Map.of("roles", roles));

        UserRecord updated = FirebaseAuth.getInstance().updateUser(updateRequest);

        // Audit log
        try {
            com.google.cloud.firestore.Firestore db = com.google.firebase.cloud.FirestoreClient.getFirestore();
            db.collection("audit_logs").add(Map.of(
                    "type", "role_change",
                    "adminUid", claimsMap.getOrDefault("sub", "system"),
                    "targetUid", uid,
                    "roles", roles,
                    "timestamp", System.currentTimeMillis()));
        } catch (Exception e) {
            // log and continue
            System.err.println("Failed to write audit log: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("uid", updated.getUid(), "status", "roles_updated"));
    }
}
