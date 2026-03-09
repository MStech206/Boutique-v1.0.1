package com.super_admin_backend.Entity;

import com.super_admin_backend.Enums.StaffRole;
import com.super_admin_backend.Enums.TaskStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
@Getter
@Setter
@Entity
@Table(name = "tasks")
public class Task {

    @Id
     private String id;
    private String firestoreId; // Firestore document ID
    private String taskName;

    @Enumerated(EnumType.STRING)
    private TaskStatus status = TaskStatus.AVAILABLE;
    @Getter
    @Setter
    @Enumerated(EnumType.STRING)
    private StaffRole stage; // Role currently supposed to do this task


    private String assignedStaff;

    private LocalDateTime createdAt ;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    @Column(name = "order_id", unique = true, nullable = false)
    private String orderId;


    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
