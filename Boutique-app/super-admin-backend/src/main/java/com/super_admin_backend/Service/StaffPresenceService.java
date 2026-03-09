package com.super_admin_backend.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import com.super_admin_backend.Entity.Staff;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class StaffPresenceService {

    @Autowired
    private Firestore firestore;

    public void setStaffOnline(Staff staff) {

        Map<String, Object> data = new HashMap<>();
        data.put("staffId", "staff_" + staff.getId());
        data.put("username", staff.getUsername());
        data.put("online", true);
        data.put("busy", false);
        data.put("fcmToken", staff.getFcmToken());
        data.put("lastSeen", Timestamp.now());

        firestore.collection("staff_status")
                .document("staff_" + staff.getId())
                .set(data);
    }
}
