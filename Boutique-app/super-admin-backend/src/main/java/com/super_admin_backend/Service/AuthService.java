package com.super_admin_backend.Service;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.super_admin_backend.Entity.Admin;
import com.super_admin_backend.Enums.Role;
import com.super_admin_backend.Utility.JwtUtil;
import com.super_admin_backend.dto.LoginRequest;
import com.super_admin_backend.dto.LoginResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.EnumSet;

@Service
public class AuthService {

    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    // ✅ Allowed roles for this login
    private static final EnumSet<Role> ALLOWED_ROLES =
            EnumSet.of(Role.MAIN_BRANCH_ADMIN, Role.BRANCH_ADMIN);

    public AuthService(PasswordEncoder encoder, JwtUtil jwtUtil) {
        this.encoder = encoder;
        this.jwtUtil = jwtUtil;
    }

    public LoginResponse login(LoginRequest req) {

        System.out.println("🔐 LOGIN ATTEMPT");
        System.out.println("📧 EMAIL = " + req.getEmail());
        System.out.println("🔑 RAW PASSWORD = " + req.getPassword());

        try {
            // 🔍 Query Firestore by email field
            QuerySnapshot querySnapshot = FirestoreClient.getFirestore()
                    .collection("admins")
                    .whereEqualTo("email", req.getEmail().trim())
                    .limit(1)
                    .get()
                    .get();

            if (querySnapshot.isEmpty()) {
                System.out.println("❌ NO ADMIN FOUND FOR EMAIL");
                throw new RuntimeException("Invalid credentials");
            }

            DocumentSnapshot snapshot = querySnapshot.getDocuments().get(0);
            Admin admin = snapshot.toObject(Admin.class);

            if (admin == null) {
                System.out.println("❌ ADMIN OBJECT NULL");
                throw new RuntimeException("Invalid credentials");
            }

            // 🧪 Debug
            System.out.println("👤 ADMIN EMAIL = " + admin.getEmail());
            System.out.println("🧾 ROLE = " + admin.getRole());
            System.out.println("🔐 HASHED PASSWORD = " + admin.getPassword());

            // ✅ Active check
            if (!admin.isActive()) {
                System.out.println("❌ ACCOUNT INACTIVE");
                throw new RuntimeException("Account inactive");
            }

            // 🔐 BCrypt check
            boolean match = encoder.matches(req.getPassword(), admin.getPassword());
            System.out.println("🔍 PASSWORD MATCH = " + match);

            if (!match) {
                throw new RuntimeException("Invalid credentials");
            }

            // 🎟️ Generate JWT
            return new LoginResponse(
                    jwtUtil.generateAdminToken(admin),
                    admin.getRole().name(),
                    admin.getBranchId(),
                    admin.getName(),
                    admin.getEmail()
            );

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Invalid credentials");
        }
    }
}