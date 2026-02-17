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
@Document(collection = "staff")
public class Staff {
    
    @Id
    private String id;
    
    private String staffId; // Unique identifier like "STAFF-001"
    private String name;
    private String phone;
    private String role; // dyer, cutter, tailor, qc, delivery
    
    private List<String> expertise;
    
    private Availability availability;
    private WorkloadInfo currentWorkload;
    private Statistics statistics;
    
    private Location location;
    private ContactInfo contact;
    
    private LocalDateTime joinDate;
    private Boolean isActive;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Availability {
        private String status; // available, busy, on-leave, offline
        private LocalDateTime lastUpdated;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkloadInfo {
        private Integer activeTasks;
        private Integer pausedTasks;
        private Integer maxConcurrentTasks;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Statistics {
        private Integer totalTasksCompleted;
        private Integer averageCompletionTime; // in minutes
        private Double qualityRating; // out of 5
        private Integer onTimeDelivery; // percentage
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Location {
        private Double latitude;
        private Double longitude;
        private LocalDateTime lastUpdated;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ContactInfo {
        private String whatsapp;
        private String email;
        private String alternatePhone;
    }
}
