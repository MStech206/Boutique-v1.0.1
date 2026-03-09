package com.super_admin_backend.Controller;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.super_admin_backend.Entity.Staff;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/staff/fcm")
public class StaffFcmController {

    private final Firestore firestore;
    private static final String STAFF_COLLECTION = "staffs";

    public StaffFcmController(Firestore firestore) {
        this.firestore = firestore;
    }

    @PostMapping("/register")
    public String registerToken(@RequestParam String fcmToken) throws ExecutionException, InterruptedException {
        // ✅ Get currently authenticated username
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        // ✅ Query Firestore for staff by username
        var snapshot = firestore.collection(STAFF_COLLECTION)
                .whereEqualTo("username", username)
                .get()
                .get();

        if (snapshot.isEmpty()) {
            throw new RuntimeException("Staff not found");
        }

        DocumentSnapshot doc = snapshot.getDocuments().get(0);
        Staff staff = doc.toObject(Staff.class);

        if (staff == null) {
            throw new RuntimeException("Staff data corrupted");
        }

        // ✅ Update FCM token
        staff.setFcmToken(fcmToken);
        doc.getReference().set(staff).get();

        return "FCM token registered successfully";
    }
}
