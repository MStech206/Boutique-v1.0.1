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
@Document(collection = "workflowTemplates")
public class WorkflowTemplate {
    
    @Id
    private String id;
    
    private String templateId;
    private String name;
    
    private String category; // men, women, kids, etc. or "all" for universal
    private String subcategory;
    
    private List<WorkflowStage> stages;
    
    private Boolean isActive;
    
    private LocalDateTime createdAt;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WorkflowStage {
        private Integer index;
        private String name; // dye, cutting, stitching, qc, delivery
        private String displayName;
        private Integer estimatedTime; // in minutes
        private String requiredRole; // dyer, cutter, tailor, qc, delivery
        private String description;
    }
}
