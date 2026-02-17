package com.sapthala.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "tasks")
public class Task {
    
    @Id
    private String id;
    
    private String taskId; // Unique identifier like "TASK-1234567890"
    private String orderId;
    
    // Order details for quick access
    private OrderDetails orderDetails;
    
    private String stage; // dye, cutting, stitching, qc, delivery
    private Integer stageIndex;
    private String description;
    
    private String status; // pending, in-progress, paused, completed, failed
    
    private StaffAssignment assignedTo;
    
    private List<StatusHistory> statusHistory;
    
    private Integer estimatedDuration; // in minutes
    private Integer actualDuration;
    
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime pausedAt;
    
    private List<TaskPhoto> photos;
    
    private String notes;
    private String priority; // low, normal, high, urgent
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderDetails {
        private String customerName;
        private String customerPhone;
        private String garmentName;
        private String deliveryDate;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StaffAssignment {
        private String staffId;
        private String name;
        private String phone;
        private String role;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatusHistory {
        private String status;
        private LocalDateTime timestamp;
        private String changedBy;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TaskPhoto {
        private String url;
        private LocalDateTime capturedAt;
        private String description;
    }
}
