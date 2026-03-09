package com.super_admin_backend.Service;

import com.google.firebase.messaging.*;
import com.super_admin_backend.Entity.Staff;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class FcmNotificationService {

    private static final Logger log = LoggerFactory.getLogger(FcmNotificationService.class);

    @Autowired
    private FirebaseMessaging firebaseMessaging;

    // 🔹 Send task assignment notification
    public void sendTaskNotification(Staff staff, String taskName) {
        if (staff.getFcmToken() == null || staff.getFcmToken().isBlank()) return;

        Notification notification = Notification.builder()
                .setTitle("New Task Assigned")
                .setBody("You have a new task: " + taskName)
                .build();

        Message message = Message.builder()
                .setToken(staff.getFcmToken())
                .setNotification(notification)
                .putData("type", "TASK_ASSIGNED")   // ✅ consistent payload
                .putData("taskName", taskName)
                .build();

        try {
            firebaseMessaging.send(message);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send task notification to staff {}: {}", staff.getId(), e.getMessage());
        }
    }

    // 🔹 Send task offer (popup to accept/reject)
    public void sendTaskOfferNotification(Staff staff, String taskName) {
        if (staff.getFcmToken() == null || staff.getFcmToken().isBlank()) return;

        Notification notification = Notification.builder()
                .setTitle("Task Offer")
                .setBody("You have a task offer: " + taskName + ". Accept or Reject.")
                .build();

        Message message = Message.builder()
                .setToken(staff.getFcmToken())
                .setNotification(notification)
                .putData("type", "TASK_OFFER")
                .putData("taskName", taskName)
                .build();

        try {
            firebaseMessaging.send(message);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send task offer notification to staff {}: {}", staff.getId(), e.getMessage());
        }
    }

    // 🔹 Send confirmation after staff accepts task
    public void sendTaskAcceptedConfirmation(Staff staff, String taskName) {
        if (staff.getFcmToken() == null || staff.getFcmToken().isBlank()) return;

        Notification notification = Notification.builder()
                .setTitle("Task Accepted")
                .setBody("You have accepted the task: " + taskName)
                .build();

        Message message = Message.builder()
                .setToken(staff.getFcmToken())
                .setNotification(notification)
                .putData("type", "TASK_ACCEPTED")
                .putData("taskName", taskName)
                .build();

        try {
            firebaseMessaging.send(message);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send task accepted confirmation to staff {}: {}", staff.getId(), e.getMessage());
        }
    }
}
