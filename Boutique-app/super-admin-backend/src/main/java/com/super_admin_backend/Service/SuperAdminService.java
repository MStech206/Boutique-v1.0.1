package com.super_admin_backend.Service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.super_admin_backend.Entity.BoutiqueAdmin;
import com.super_admin_backend.Entity.Client;
import com.super_admin_backend.dto.AdminDTO;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class SuperAdminService {

    private final Firestore firestore;
    private final BCryptPasswordEncoder passwordEncoder;

    private static final String ADMIN_COLLECTION = "boutique_admins";
    private static final String CLIENT_COLLECTION = "clients";

    // 🔐 Roles
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_MAIN_BRANCH_ADMIN = "MAIN_BRANCH_ADMIN";

    public SuperAdminService(Firestore firestore,
                             BCryptPasswordEncoder passwordEncoder) {
        this.firestore = firestore;
        this.passwordEncoder = passwordEncoder;
    }

    // =====================================================
    // ✅ EXISTING METHOD (DO NOT CHANGE)
    // =====================================================
    public BoutiqueAdmin addAdminToClient(String clientId, BoutiqueAdmin admin)
            throws ExecutionException, InterruptedException {

        DocumentSnapshot clientSnap =
                firestore.collection(CLIENT_COLLECTION)
                        .document(clientId)
                        .get().get();

        if (!clientSnap.exists()) {
            throw new RuntimeException("Client not found with id: " + clientId);
        }

        QuerySnapshot snapshot =
                firestore.collection(ADMIN_COLLECTION)
                        .whereEqualTo("username", admin.getUsername())
                        .get().get();

        if (!snapshot.isEmpty()) {
            throw new RuntimeException("Username already exists!");
        }

        admin.setId(admin.getUsername());
        admin.setClientId(clientId);
        admin.setPassword(passwordEncoder.encode(admin.getPassword()));
        admin.setRole(ROLE_ADMIN);

        firestore.collection(ADMIN_COLLECTION)
                .document(admin.getId())
                .set(admin)
                .get();

        return admin;
    }

    // =====================================================
    // ✅ EXISTING METHOD (DO NOT CHANGE)
    // =====================================================
    public List<AdminDTO> getAllAdmins()
            throws ExecutionException, InterruptedException {

        QuerySnapshot snapshot =
                firestore.collection(ADMIN_COLLECTION)
                        .get().get();

        return snapshot.getDocuments().stream()
                .map(doc -> {
                    BoutiqueAdmin admin = doc.toObject(BoutiqueAdmin.class);
                    return new AdminDTO(
                            doc.getId(),
                            admin.getName(),
                            admin.getEmail(),
                            admin.getUsername(),
                            admin.getStatus(),
                            admin.getClientId(),
                            "N/A"
                    );
                })
                .collect(Collectors.toList());
    }

    // =====================================================
    // ✅ EXISTING METHOD (DO NOT CHANGE)
    // =====================================================
    public List<AdminDTO> getAdminsByClient(String clientId)
            throws ExecutionException, InterruptedException {

        DocumentSnapshot clientSnap =
                firestore.collection(CLIENT_COLLECTION)
                        .document(clientId)
                        .get().get();

        if (!clientSnap.exists()) {
            throw new RuntimeException("Client not found with id: " + clientId);
        }

        Client client = clientSnap.toObject(Client.class);

        QuerySnapshot snapshot =
                firestore.collection(ADMIN_COLLECTION)
                        .whereEqualTo("clientId", clientId)
                        .get().get();

        return snapshot.getDocuments().stream()
                .map(doc -> {
                    BoutiqueAdmin admin = doc.toObject(BoutiqueAdmin.class);
                    return new AdminDTO(
                            doc.getId(),
                            admin.getName(),
                            admin.getEmail(),
                            admin.getUsername(),
                            admin.getStatus(),
                            client.getId(),
                            client.getBoutiqueName()
                    );
                })
                .collect(Collectors.toList());
    }

    // =====================================================
    // ✅ EXISTING METHOD (DO NOT CHANGE)
    // =====================================================
    public BoutiqueAdmin updateAdmin(String adminId,
                                     BoutiqueAdmin updatedAdmin)
            throws ExecutionException, InterruptedException {

        DocumentReference docRef =
                firestore.collection(ADMIN_COLLECTION)
                        .document(adminId);

        DocumentSnapshot snapshot = docRef.get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Admin not found");
        }

        BoutiqueAdmin admin = snapshot.toObject(BoutiqueAdmin.class);

        admin.setName(updatedAdmin.getName());
        admin.setEmail(updatedAdmin.getEmail());
        admin.setStatus(updatedAdmin.getStatus());
        admin.setUsername(updatedAdmin.getUsername());

        if (updatedAdmin.getRole() != null &&
                !updatedAdmin.getRole().isBlank()) {
            admin.setRole(updatedAdmin.getRole());
        }

        if (updatedAdmin.getPassword() != null &&
                !updatedAdmin.getPassword().isBlank()) {
            admin.setPassword(
                    passwordEncoder.encode(updatedAdmin.getPassword()));
        }

        docRef.set(admin).get();
        return admin;
    }

    // =====================================================
    // ✅ EXISTING METHOD (DO NOT CHANGE)
    // =====================================================
    public void deleteAdmin(String adminId)
            throws ExecutionException, InterruptedException {

        firestore.collection(ADMIN_COLLECTION)
                .document(adminId)
                .delete()
                .get();
    }

    // =====================================================
    // ✅ EXISTING METHOD (DO NOT CHANGE)
    // =====================================================
    public long countAdmins()
            throws ExecutionException, InterruptedException {

        QuerySnapshot snapshot =
                firestore.collection(ADMIN_COLLECTION)
                        .get().get();

        return snapshot.size();
    }

    // =====================================================
    // 🆕 CREATE MAIN BRANCH ADMIN (FIRESTORE VERSION)
    // =====================================================
    public BoutiqueAdmin createMainBranchAdmin(String clientId,
                                               BoutiqueAdmin admin)
            throws ExecutionException, InterruptedException {

        DocumentSnapshot clientSnap =
                firestore.collection(CLIENT_COLLECTION)
                        .document(clientId)
                        .get().get();

        if (!clientSnap.exists()) {
            throw new RuntimeException("Client not found");
        }

        QuerySnapshot existing =
                firestore.collection(ADMIN_COLLECTION)
                        .whereEqualTo("username", admin.getUsername())
                        .get().get();

        if (!existing.isEmpty()) {
            throw new RuntimeException("Username already exists");
        }

        admin.setId(admin.getUsername());
        admin.setClientId(clientId);
        admin.setRole(ROLE_MAIN_BRANCH_ADMIN);
        admin.setStatus("Active");
        admin.setPassword(passwordEncoder.encode(admin.getPassword()));
        // MAIN admin has no branch

        firestore.collection(ADMIN_COLLECTION)
                .document(admin.getId())
                .set(admin)
                .get();

        return admin;
    }

    // =====================================================
    // 🆕 DELETE ONLY MAIN BRANCH ADMIN
    // =====================================================
    public void deleteMainBranchAdmin(String adminId)
            throws ExecutionException, InterruptedException {

        DocumentReference docRef =
                firestore.collection(ADMIN_COLLECTION)
                        .document(adminId);

        DocumentSnapshot snapshot = docRef.get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Admin not found");
        }

        BoutiqueAdmin admin = snapshot.toObject(BoutiqueAdmin.class);

        if (!ROLE_MAIN_BRANCH_ADMIN.equals(admin.getRole())) {
            throw new RuntimeException(
                    "SUPER ADMIN can delete ONLY MAIN_BRANCH_ADMIN"
            );
        }

        docRef.delete().get();
    }
    // =====================================================
// 🆕 GET CLIENT → BRANCHES → SUB ADMINS
// =====================================================
    public Map<String, Object> getClientHierarchy(String clientId)
            throws ExecutionException, InterruptedException {

        // Client (Main Branch Admin is client itself)
        DocumentSnapshot clientSnap =
                firestore.collection("clients")
                        .document(clientId)
                        .get().get();

        if (!clientSnap.exists()) {
            throw new RuntimeException("Client not found");
        }

        Client client = clientSnap.toObject(Client.class);

        // Branches
        QuerySnapshot branchSnap =
                firestore.collection("branches")
                        .whereEqualTo("clientId", clientId)
                        .get().get();

        List<Map<String, Object>> branches =
                branchSnap.getDocuments().stream().map(branchDoc -> {

                    String branchId = branchDoc.getId();

                    List<BoutiqueAdmin> subAdmins =
                            null;
                    try {
                        subAdmins = firestore.collection("boutique_admins")
                                .whereEqualTo("branchId", branchId)
                                .whereEqualTo("role", "SUB_ADMIN")
                                .get().get()
                                .toObjects(BoutiqueAdmin.class);
                    } catch (InterruptedException e) {
                        throw new RuntimeException(e);
                    } catch (ExecutionException e) {
                        throw new RuntimeException(e);
                    }

                    return Map.of(
                            "branch", branchDoc.getData(),
                            "subAdmins", subAdmins
                    );
                }).toList();

        return Map.of(
                "client", client,
                "branches", branches
        );
    }
    public void deleteAdminSafely(String adminId)
            throws ExecutionException, InterruptedException {

        DocumentReference adminRef =
                firestore.collection(ADMIN_COLLECTION).document(adminId);

        DocumentSnapshot snapshot = adminRef.get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Admin not found");
        }

        // Just delete the Firestore record
        adminRef.delete().get();
    }

    // =====================================================
    // CHANGE ADMIN PASSWORD
    // =====================================================
    public void changeAdminPassword(String adminId, String newPassword)
            throws ExecutionException, InterruptedException {

        DocumentReference adminRef =
                firestore.collection(ADMIN_COLLECTION).document(adminId);

        DocumentSnapshot snapshot = adminRef.get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Admin not found");
        }

        BoutiqueAdmin admin = snapshot.toObject(BoutiqueAdmin.class);

        // Update password using BCrypt (same as other methods)
        admin.setPassword(passwordEncoder.encode(newPassword));

        adminRef.set(admin).get();
    }

    // =====================================================
    // 🆕 CHANGE PASSWORD (MAIN BRANCH ADMIN ONLY)
    // =====================================================
    public void changeMainAdminPassword(String adminId,
                                        String newPassword)
            throws ExecutionException, InterruptedException {

        DocumentReference docRef =
                firestore.collection(ADMIN_COLLECTION)
                        .document(adminId);

        DocumentSnapshot snapshot = docRef.get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Admin not found");
        }

        BoutiqueAdmin admin = snapshot.toObject(BoutiqueAdmin.class);

        if (!ROLE_MAIN_BRANCH_ADMIN.equals(admin.getRole())) {
            throw new RuntimeException(
                    "SUPER ADMIN can change password ONLY for MAIN_BRANCH_ADMIN"
            );
        }

        admin.setPassword(passwordEncoder.encode(newPassword));
        docRef.set(admin).get();
    }
}
