package com.sapthala.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "notifications")
public class Notification {
    
    @Id
    private String id;
    
    private String notificationId;
    private String staffId;
    
    private String type; // new-task, task-update, system-alert, order-update
    private String title;
    private String body;
    
    private Map<String, Object> data;
    
    private Boolean isRead;
    private LocalDateTime readAt;
    
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt; // 30 days TTL
}
