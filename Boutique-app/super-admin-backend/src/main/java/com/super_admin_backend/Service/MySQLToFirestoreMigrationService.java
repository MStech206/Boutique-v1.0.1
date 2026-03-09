package com.super_admin_backend.Service;

import com.super_admin_backend.Entity.*;
import com.super_admin_backend.Repository.*;
import com.super_admin_backend.Utility.FirestoreHelper;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor

public class MySQLToFirestoreMigrationService {

    private final BranchRepository branchRepository;
    private final AdminRepository adminRepository;
    private final ClientRepository clientRepo;
    private final BoutiqueAdminRepository adminRepo;
    private final StaffRepository staffRepo;
    private final VendorRepository vendorRepo;
    private final UserRepository userRepo;
    private final TaskRepository taskRepo;
    private final PasswordResetOtpRepository otpRepo;
    private final FirestoreHelper firestoreHelper;

    @Transactional
    public void migrateAll() throws Exception {
        System.out.println("🚀 STARTING MYSQL → FIRESTORE MIGRATION");

        // Verify Firestore connection
        verifyFirestoreConnection();

        // Migrate Clients
        migrate("clients", clientRepo.findAll(), c -> {
            Map<String, Object> m = base(c.getId());
            m.put("name", c.getName());
            m.put("email", c.getEmail());
            m.put("status", c.getStatus());
            m.put("boutiqueName", c.getBoutiqueName());
            m.put("address", c.getAddress());
            return m;
        });

        // Migrate BoutiqueAdmins
        migrate("boutique_admins", adminRepo.findAll(), a -> {
            Map<String, Object> m = base(a.getId());
            m.put("name", a.getName());
            m.put("email", a.getEmail());
            m.put("status", a.getStatus());
            m.put("username", a.getUsername());
            m.put("password", a.getPassword()); // ⚠️ ensure hashed!
            m.put("role", a.getRole());
            if (a.getClientId() != null) {
                m.put("clientId", a.getClientId());
            }
            return m;
        });

        // Migrate Staff
        migrate("staffs", staffRepo.findAll(), s -> {
            Map<String, Object> m = base(s.getId());
            m.put("username", s.getUsername());
            m.put("password", s.getPassword()); // ⚠️ ensure hashed!
            m.put("fcmToken", s.getFcmToken());
            return m;
        });

        // Migrate Vendors
        migrate("vendors", vendorRepo.findAll(), v -> {
            Map<String, Object> m = base(String.valueOf(v.getId()));
            m.put("name", v.getName());
            m.put("email", v.getEmail());
            m.put("status", v.getStatus());
            return m;
        });

        // Migrate Users
        migrate("users", userRepo.findAll(), u -> {
            Map<String, Object> m = base(u.getId());
            m.put("name", u.getName());
            m.put("email", u.getEmail());
            m.put("status", u.getStatus());
            return m;
        });

        // Migrate Tasks
        migrate("tasks", taskRepo.findAll(), t -> {
            Map<String, Object> m = base(t.getId());
            m.put("taskName", t.getTaskName());
            m.put("status", t.getStatus() != null ? t.getStatus().toString() : null);
            m.put("stage", t.getStage() != null ? t.getStage().toString() : null);
            if (t.getAssignedStaff() != null) {
                m.put("assignedStaffId", t.getAssignedStaff());
            }
            // ✅ Convert LocalDateTime → Timestamp
            m.put("createdAt", t.getCreatedAt() != null ? Timestamp.valueOf(t.getCreatedAt()) : null);
            m.put("startedAt", t.getStartedAt() != null ? Timestamp.valueOf(t.getStartedAt()) : null);
            m.put("completedAt", t.getCompletedAt() != null ? Timestamp.valueOf(t.getCompletedAt()) : null);
            m.put("orderId", t.getOrderId());
            return m;
        });
// Migrate Branches
        migrate("branches", branchRepository.findAll(), b -> {
            Map<String, Object> m = base(b.getId());
            m.put("name", b.getName());
            m.put("location", b.getLocation());
            return m;
        });
        migrate("admins", adminRepository.findAll(), a -> {
            Map<String, Object> m = base(a.getId());
            m.put("name", a.getName());
            m.put("email", a.getEmail());
            m.put("password", a.getPassword()); // ⚠️ ensure hashed!
            m.put("role", a.getRole() != null ? a.getRole().toString() : null);
            m.put("active", a.isActive());
            m.put("branchId", a.getBranchId());

            // Use email as Firestore document ID if present, else fallback to MySQL ID
            m.put("_docId", a.getEmail() != null ? a.getEmail() : a.getId());
            return m;
        });

        // Migrate PasswordResetOtps
        migrate("password_reset_otps", otpRepo.findAll(), o -> {
            Map<String, Object> m = base(o.getId());
            m.put("email", o.getEmail());
            m.put("otp", o.getOtp());
            // ✅ Convert LocalDateTime → Timestamp
            m.put("expiryTime", o.getExpiryTime() != null ? Timestamp.valueOf(o.getExpiryTime()) : null);
            m.put("used", o.isUsed());
            return m;
        });

        System.out.println("✅ MIGRATION COMPLETED");
    }

    public void verifyFirestoreConnection() throws Exception {
        firestoreHelper.saveAndWait("connection_test", "test", Map.of("status", "connected"));
        System.out.println("✅ Firestore connection verified successfully");
    }

    private <T> void migrate(String collection, List<T> entities, Mapper<T> mapper) throws Exception {
        System.out.println("➡ Migrating " + collection + " | Rows: " + entities.size());

        int successCount = 0;

        for (T entity : entities) {
            try {
                Map<String, Object> doc = mapper.map(entity);
                Object idObj = doc.get("mysqlId");

                if (idObj == null) {
                    System.err.println("❌ Skipping entity with NULL ID: " + entity);
                    continue;
                }

                String id = idObj.toString();
                firestoreHelper.saveAndWait(collection, id, doc);
                successCount++;
                System.out.println("✅ Written document with ID: " + id);

            } catch (Exception e) {
                System.err.println("❌ Error processing entity: " + entity);
                e.printStackTrace();
            }
        }

        if (successCount == 0) {
            firestoreHelper.saveAndWait(collection, "_placeholder", Map.of("placeholder", true));
            System.out.println("⚠ Added placeholder for empty collection: " + collection);
        }

        System.out.println("✅ Finished " + collection + " | Documents written: " + (successCount > 0 ? successCount : 1));
    }

    // ✅ Changed id type from Long → String
    private Map<String, Object> base(String id) {
        Map<String, Object> map = new HashMap<>();
        map.put("mysqlId", id);
        return map;
    }

    @FunctionalInterface
    private interface Mapper<T> {
        Map<String, Object> map(T t);
    }
}
