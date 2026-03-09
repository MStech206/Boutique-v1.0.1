package com.super_admin_backend.Service;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.super_admin_backend.Entity.Staff;
import com.super_admin_backend.Enums.StaffRole;
import com.super_admin_backend.Utility.JwtUtil;
import com.super_admin_backend.Utility.RoleMapping;
import com.super_admin_backend.dto.StaffLoginResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutionException;

@Service
public class StaffAuthService {

    @Autowired
    private Firestore firestore;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RoleMapping roleMapping;

    @Autowired
    private JwtUtil jwtUtil;

    private static final String STAFF_COLLECTION = "staffs";

    public StaffLoginResponse login(String username, String password) {
        try {
            // 🔹 Query Firestore by username
            QuerySnapshot snapshot = firestore.collection(STAFF_COLLECTION)
                    .whereEqualTo("username", username)
                    .get()
                    .get();

            if (snapshot.isEmpty()) {
                throw new RuntimeException("Invalid credentials");
            }

            Staff staff = snapshot.getDocuments().get(0).toObject(Staff.class);

            // 🔹 Validate password
            if (!passwordEncoder.matches(password, staff.getPassword())) {
                throw new RuntimeException("Invalid credentials");
            }

            // 🔹 Get role
            StaffRole role = roleMapping.getRole(username);
            if (role == null) throw new RuntimeException("Role not assigned");

            // 🔹 Generate JWT
            String token = jwtUtil.generateStaffToken(staff.getUsername() ,role);

            return new StaffLoginResponse(token, role.name());

        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Error during login", e);
        }
    }
}
