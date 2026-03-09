package com.super_admin_backend.Service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.super_admin_backend.Entity.Vendor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class VendorService {

    @Autowired
    private Firestore firestore;

    private static final String VENDOR_COLLECTION = "vendors";

    // Get all vendors
    public List<Vendor> getAllVendors() throws ExecutionException, InterruptedException {
        QuerySnapshot snapshot = firestore.collection(VENDOR_COLLECTION).get().get();
        return snapshot.getDocuments().stream()
                .map(doc -> doc.toObject(Vendor.class))
                .collect(Collectors.toList());
    }

    // Get vendor by ID
    public Vendor getVendorById(String id) throws ExecutionException, InterruptedException {
        DocumentSnapshot snapshot = firestore.collection(VENDOR_COLLECTION).document(id).get().get();
        if (!snapshot.exists()) {
            throw new RuntimeException("Vendor not found with id: " + id);
        }
        return snapshot.toObject(Vendor.class);
    }

    // Save new vendor
    public Vendor saveVendor(Vendor vendor) throws ExecutionException, InterruptedException {
        firestore.collection(VENDOR_COLLECTION).document(String.valueOf(vendor.getId())).set(vendor).get();
        return vendor;
    }

    // Update vendor
    public Vendor updateVendor(String id, Vendor updatedVendor) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection(VENDOR_COLLECTION).document(id);
        DocumentSnapshot snapshot = docRef.get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Vendor not found with id: " + id);
        }

        Vendor vendor = snapshot.toObject(Vendor.class);
        vendor.setName(updatedVendor.getName());
        vendor.setEmail(updatedVendor.getEmail());
        vendor.setStatus(updatedVendor.getStatus());

        docRef.set(vendor).get();
        return vendor;
    }

    // Delete vendor
    public void deleteVendor(String id) throws ExecutionException, InterruptedException {
        firestore.collection(VENDOR_COLLECTION).document(id).delete().get();
    }

    // Count vendors
    public long countVendors() throws ExecutionException, InterruptedException {
        QuerySnapshot snapshot = firestore.collection(VENDOR_COLLECTION).get().get();
        return snapshot.size();
    }
}
