package com.super_admin_backend.Service;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class FirebaseStaffStatusService {

    private static final Logger log = LoggerFactory.getLogger(FirebaseStaffStatusService.class);

    private final Firestore firestore;

    @Autowired
    public FirebaseStaffStatusService(Firestore firestore) {
        this.firestore = firestore;
    }

    public boolean isStaffOnline(String staffId) {
        try {
            DocumentSnapshot doc = firestore
                    .collection("staff_status")
                    .document("staff_" + staffId)   // ✅ staffId is String now
                    .get()
                    .get();

            if (!doc.exists()) {
                log.warn("❌ No Firebase doc for staff_{}", staffId);
                return false;
            }

            Boolean online = doc.getBoolean("online");
            return online != null && online;

        } catch (Exception e) {
            log.error("Error checking staff online status for staff_{}: {}", staffId, e.getMessage());
            return false;
        }
    }
}
