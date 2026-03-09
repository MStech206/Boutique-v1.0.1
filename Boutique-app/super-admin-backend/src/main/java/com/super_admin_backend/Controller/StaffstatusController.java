package com.super_admin_backend.Controller;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.super_admin_backend.Entity.Staff;
import com.super_admin_backend.Service.StaffPresenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("api/test/")
public class StaffstatusController {

    private final Firestore firestore;
    private final StaffPresenceService staffPresenceService;
    private static final String STAFF_COLLECTION = "staffs";

    public StaffstatusController(Firestore firestore, StaffPresenceService staffPresenceService) {
        this.firestore = firestore;
        this.staffPresenceService = staffPresenceService;
    }

    @PostMapping("staff/{id}/online")
    public ResponseEntity<?> makeOnline(@PathVariable String id) throws ExecutionException, InterruptedException {
        // ✅ Fetch staff by Firestore document ID
        DocumentSnapshot snapshot = firestore.collection(STAFF_COLLECTION).document(id).get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Staff not found");
        }

        Staff staff = snapshot.toObject(Staff.class);
        if (staff == null) {
            throw new RuntimeException("Staff data corrupted");
        }

        // ✅ Mark staff online
        staffPresenceService.setStaffOnline(staff);

        // ✅ Save updated staff back to Firestore
        firestore.collection(STAFF_COLLECTION).document(id).set(staff).get();

        return ResponseEntity.ok("Staff " + staff.getUsername() + " is ONLINE");
    }
}
