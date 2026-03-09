package com.super_admin_backend.Service;


import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.super_admin_backend.Entity.Admin;
import com.super_admin_backend.Entity.Branch;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutionException;

@Service
public class AdminService {

    private final Firestore firestore;

    public AdminService() {
        this.firestore = FirestoreClient.getFirestore();
    }

    // 🔹 Get Admin by email
    public Admin getAdminByEmail(String email) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("admins").document(email);
        ApiFuture<DocumentSnapshot> future = docRef.get();
        DocumentSnapshot snapshot = future.get();

        if (snapshot.exists()) {
            return snapshot.toObject(Admin.class);
        } else {
            throw new RuntimeException("Admin not found");
        }
    }

    // 🔹 Get Admin's branch
    public String getAdminBranch(String email) throws ExecutionException, InterruptedException {
        Admin admin = getAdminByEmail(email);
        return admin.getBranchId();
    }
}
