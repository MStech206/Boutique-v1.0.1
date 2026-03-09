package com.super_admin_backend.Service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.super_admin_backend.Entity.BoutiqueAdmin;
import com.super_admin_backend.Entity.Client;
import com.super_admin_backend.Error.UsernameAlreadyExistsException;
import com.super_admin_backend.dto.AdminDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class BoutiqueAdminService {
    @Autowired
    private Firestore firestore;

    private static final String ADMIN_COLLECTION = "boutique_admins";
    private static final String CLIENT_COLLECTION = "clients";

    public List<AdminDTO> getAllAdmins() throws ExecutionException, InterruptedException {

        QuerySnapshot snapshot = firestore.collection(ADMIN_COLLECTION).get().get();

        return snapshot.getDocuments().stream().map(doc -> {

            BoutiqueAdmin admin = doc.toObject(BoutiqueAdmin.class);
            if (admin == null) return null;

            AdminDTO dto = new AdminDTO();
            dto.setId(doc.getId());
            dto.setName(admin.getName());
            dto.setEmail(admin.getEmail());
            dto.setUsername(admin.getUsername());
            dto.setStatus(admin.getStatus());
            dto.setClientId(admin.getClientId());

            // 🔥 THIS IS CRITICAL
            if (admin.getClientId() != null) {
                try {
                    DocumentSnapshot clientSnap = firestore
                            .collection("clients")
                            .document(admin.getClientId())
                            .get()
                            .get();

                    if (clientSnap.exists()) {
                        dto.setBoutiqueName(clientSnap.getString("boutiqueName"));
                    }
                } catch (Exception ignored) {}
            }

            return dto;

        }).filter(Objects::nonNull).collect(Collectors.toList());
    }

    public BoutiqueAdmin createAdminInternal(String clientId, BoutiqueAdmin admin)
            throws ExecutionException, InterruptedException {

        if (clientId == null || clientId.isBlank()) {
            throw new IllegalArgumentException("clientId is required");
        }

        // username uniqueness
        QuerySnapshot snapshot = firestore.collection(ADMIN_COLLECTION)
                .whereEqualTo("username", admin.getUsername())
                .limit(1)
                .get()
                .get();

        if (!snapshot.isEmpty()) {
            throw new UsernameAlreadyExistsException(
                    "Username already exists: " + admin.getUsername()
            );
        }

        // fetch client ONCE
        DocumentSnapshot clientSnap = firestore.collection(CLIENT_COLLECTION)
                .document(clientId)
                .get()
                .get();

        if (!clientSnap.exists()) {
            throw new RuntimeException("Client not found: " + clientId);
        }

        String boutiqueName = clientSnap.getString("boutiqueName");

        admin.setClientId(clientId);
        admin.setBoutiqueName(boutiqueName);

        // 🔥 ALWAYS AUTO-ID
        DocumentReference docRef =
                firestore.collection(ADMIN_COLLECTION).document();

        admin.setId(docRef.getId());

        docRef.set(admin).get();
        return admin;
    }


    // ✅ GET ADMIN BY ID (already optimal)
    public BoutiqueAdmin getAdminById(String id)
            throws ExecutionException, InterruptedException {

        DocumentSnapshot snapshot =
                firestore.collection(ADMIN_COLLECTION)
                        .document(id)
                        .get()
                        .get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Admin not found with id: " + id);
        }

        BoutiqueAdmin admin = snapshot.toObject(BoutiqueAdmin.class);
        if (admin != null) {
            admin.setId(snapshot.getId());
        }
        return admin;
    }

    // SAVE ADMIN
/*
    public BoutiqueAdmin saveAdmin(BoutiqueAdmin admin) throws ExecutionException, InterruptedException {

        // Check uniqueness of username
        QuerySnapshot snapshot = firestore.collection(ADMIN_COLLECTION)
                .whereEqualTo("username", admin.getUsername())
                .limit(1)
                .get()
                .get();

        if (!snapshot.isEmpty()) {
            throw new UsernameAlreadyExistsException(
                    "Username already exists: " + admin.getUsername()
            );
        }

        // Auto-generate ID if not provided
        DocumentReference docRef;
        if (admin.getId() == null || admin.getId().isEmpty()) {
            docRef = firestore.collection(ADMIN_COLLECTION).document(); // Firestore generates ID
            admin.setId(docRef.getId()); // save generated ID in object
        } else {
            docRef = firestore.collection(ADMIN_COLLECTION).document(admin.getId());
        }

        docRef.set(admin).get();
        return admin;
    }
*/

    // ✅ UPDATE ADMIN (already optimal)
    public BoutiqueAdmin updateAdmin(String id, BoutiqueAdmin updatedAdmin)
            throws ExecutionException, InterruptedException {

        DocumentReference docRef =
                firestore.collection(ADMIN_COLLECTION).document(id);

        DocumentSnapshot snapshot = docRef.get().get();
        if (!snapshot.exists()) {
            throw new RuntimeException("Admin not found with id: " + id);
        }

        BoutiqueAdmin admin = snapshot.toObject(BoutiqueAdmin.class);

        admin.setName(updatedAdmin.getName());
        admin.setEmail(updatedAdmin.getEmail());
        admin.setStatus(updatedAdmin.getStatus());

        docRef.set(admin).get();
        return admin;
    }

    // ✅ DELETE ADMIN (already optimal)
    public void deleteAdmin(String id)
            throws ExecutionException, InterruptedException {

        firestore.collection(ADMIN_COLLECTION)
                .document(id)
                .delete()
                .get();
    }

    // 🚀 COUNT ADMINS (🔥 MAJOR FIX)
    public long countAdmins()
            throws ExecutionException, InterruptedException {

        return firestore.collection(ADMIN_COLLECTION)
                .count()
                .get()
                .get()
                .getCount();
    }

    // Example for chart (unchanged)
    public List<Integer> getActiveAdminsLast7Days() {
        return List.of(2, 3, 4, 5, 3, 6, 4);
    }

    // ADD ADMIN TO CLIENT
    public BoutiqueAdmin addAdminToClient(String clientId, BoutiqueAdmin admin)
            throws ExecutionException, InterruptedException {

        if (clientId == null || clientId.isEmpty()) {
            throw new IllegalArgumentException("clientId cannot be null or empty");
        }

        if (admin.getEmail() == null || admin.getEmail().isEmpty()) {
            throw new IllegalArgumentException("Admin email cannot be null or empty");
        }

        // 🔹 Use email as document ID
        DocumentReference docRef = firestore.collection(ADMIN_COLLECTION)
                .document(admin.getEmail());

        // 🔹 Check if admin with this email already exists
        DocumentSnapshot existing = docRef.get().get();
        if (existing.exists()) {
            throw new UsernameAlreadyExistsException("Username already exists: " + admin.getUsername());
        }

        // 🔹 Fetch client document to get boutiqueName
        DocumentSnapshot clientSnap = firestore.collection("clients")
                .document(clientId)
                .get()
                .get();

        if (!clientSnap.exists()) {
            throw new RuntimeException("Client not found with id: " + clientId);
        }

        String boutiqueName = clientSnap.getString("boutiqueName");

        // 🔹 Set clientId and boutiqueName
        admin.setClientId(clientId);
        admin.setBoutiqueName(boutiqueName);

        // 🔹 Save admin using email as ID
        docRef.set(admin).get();

        // 🔹 Set ID in admin object (email used as ID)
        admin.setId(admin.getEmail());

        return admin;
    }

    public List<AdminDTO> getAdminsByClient(String clientId)
            throws ExecutionException, InterruptedException {

        // fetch client once (for display only)
        DocumentSnapshot clientSnap =
                firestore.collection(CLIENT_COLLECTION)
                        .document(clientId)
                        .get()
                        .get();

        if (!clientSnap.exists()) {
            throw new RuntimeException("Client not found with id: " + clientId);
        }

        Client client = clientSnap.toObject(Client.class);

        QuerySnapshot snapshot =
                firestore.collection(ADMIN_COLLECTION)
                        .whereEqualTo("clientId", clientId)
                        .get()
                        .get();

        return snapshot.getDocuments()
                .stream()
                .map(doc -> {
                    BoutiqueAdmin a = doc.toObject(BoutiqueAdmin.class);
                    return new AdminDTO(
                            doc.getId(),
                            a.getName(),
                            a.getEmail(),
                            a.getUsername(),
                            a.getStatus(),
                            clientId,
                            client.getBoutiqueName()
                    );
                })
                .collect(Collectors.toList());
    }

}
