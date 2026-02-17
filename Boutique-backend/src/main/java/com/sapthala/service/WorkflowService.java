package com.sapthala.service;

import com.sapthala.model.*;
import com.sapthala.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowService {
    
    private final TaskRepository taskRepository;
    private final StaffRepository staffRepository;
    private final WorkflowTemplateRepository workflowTemplateRepository;
    private final NotificationRepository notificationRepository;
    
    /**
     * Creates workflow tasks for a new order
     */
    public void createWorkflowForOrder(String orderId, String category, String subcategory, 
                                      String garmentName, String customerName, String customerPhone,
                                      String deliveryDate) {
        try {
            // Find appropriate workflow template
            WorkflowTemplate template = findWorkflowTemplate(category, subcategory);
            if (template == null) {
                log.error("No workflow template found for category: {} subcategory: {}", category, subcategory);
                return;
            }
            
            log.info("Creating workflow for Order: {}", orderId);
            
            // Create tasks for each stage
            List<Task> tasks = new ArrayList<>();
            for (WorkflowTemplate.WorkflowStage stage : template.getStages()) {
                Task task = Task.builder()
                    .taskId("TASK-" + System.currentTimeMillis() + "-" + stage.getIndex())
                    .orderId(orderId)
                    .orderDetails(Task.OrderDetails.builder()
                        .customerName(customerName)
                        .customerPhone(customerPhone)
                        .garmentName(garmentName)
                        .deliveryDate(deliveryDate)
                        .build())
                    .stage(stage.getName())
                    .stageIndex(stage.getIndex())
                    .description(stage.getDescription())
                    .status("pending")
                    .estimatedDuration(stage.getEstimatedTime())
                    .notes("")
                    .priority("normal")
                    .statusHistory(Arrays.asList(Task.StatusHistory.builder()
                        .status("pending")
                        .timestamp(LocalDateTime.now())
                        .changedBy("SYSTEM")
                        .build()))
                    .photos(new ArrayList<>())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
                
                tasks.add(task);
            }
            
            taskRepository.saveAll(tasks);
            log.info("✅ Created {} tasks for Order: {}", tasks.size(), orderId);
            
            // Auto-assign first task
            if (!tasks.isEmpty()) {
                assignTaskToAvailableStaff(tasks.get(0));
            }
            
        } catch (Exception e) {
            log.error("Error creating workflow for order: {}", orderId, e);
        }
    }
    
    /**
     * Smart auto-assignment logic
     */
    public void assignTaskToAvailableStaff(Task task) {
        try {
            // Get required role from task
            String requiredRole = getRequiredRole(task.getStage());
            
            // Find available staff with required role
            Staff assignedStaff = findBestStaffMember(requiredRole);
            
            if (assignedStaff != null) {
                task.setAssignedTo(Task.StaffAssignment.builder()
                    .staffId(assignedStaff.getStaffId())
                    .name(assignedStaff.getName())
                    .phone(assignedStaff.getPhone())
                    .role(assignedStaff.getRole())
                    .build());
                task.setStatus("assigned");
                
                taskRepository.save(task);
                
                // Update staff workload
                updateStaffWorkload(assignedStaff.getStaffId(), 1);
                
                // Send notification
                sendTaskNotification(assignedStaff.getStaffId(), task);
                
                log.info("✅ Task {} assigned to staff: {}", task.getTaskId(), assignedStaff.getName());
            } else {
                log.warn("⚠️ No available staff found for role: {}", requiredRole);
            }
        } catch (Exception e) {
            log.error("Error assigning task: {}", task.getTaskId(), e);
        }
    }
    
    /**
     * Find best available staff member based on:
     * - Availability status
     * - Current workload
     * - Quality rating
     * - Experience
     */
    private Staff findBestStaffMember(String requiredRole) {
        List<Staff> availableStaff = staffRepository
            .findByRoleAndIsActiveTrueAndAvailabilityStatus(requiredRole, "available");
        
        if (availableStaff.isEmpty()) {
            return null;
        }
        
        // Sort by: workload (ascending), quality rating (descending), experience (descending)
        return availableStaff.stream()
            .sorted(Comparator
                .comparingInt((Staff s) -> s.getCurrentWorkload().getActiveTasks()) // Less workload first
                .thenComparingDouble((Staff s) -> -s.getStatistics().getQualityRating()) // Higher rating first
                .thenComparingInt((Staff s) -> -s.getStatistics().getTotalTasksCompleted())) // More experience first
            .findFirst()
            .orElse(null);
    }
    
    /**
     * Update task status (Start, Pause, Resume, End)
     */
    public void updateTaskStatus(String taskId, String newStatus, String staffId) {
        try {
            Optional<Task> optionalTask = taskRepository.findByTaskId(taskId);
            if (optionalTask.isEmpty()) {
                log.error("Task not found: {}", taskId);
                return;
            }
            
            Task task = optionalTask.get();
            String previousStatus = task.getStatus();
            
            // Update task status
            task.setStatus(newStatus);
            task.setUpdatedAt(LocalDateTime.now());
            
            // Record status change
            if (task.getStatusHistory() == null) {
                task.setStatusHistory(new ArrayList<>());
            }
            task.getStatusHistory().add(Task.StatusHistory.builder()
                .status(newStatus)
                .timestamp(LocalDateTime.now())
                .changedBy(staffId)
                .build());
            
            // Handle status-specific logic
            switch (newStatus) {
                case "in-progress":
                    task.setStartedAt(LocalDateTime.now());
                    task.setPausedAt(null);
                    break;
                case "paused":
                    task.setPausedAt(LocalDateTime.now());
                    break;
                case "completed":
                    task.setCompletedAt(LocalDateTime.now());
                    // Calculate actual duration
                    if (task.getStartedAt() != null) {
                        long minutes = java.time.temporal.ChronoUnit.MINUTES
                            .between(task.getStartedAt(), task.getCompletedAt());
                        task.setActualDuration((int) minutes);
                    }
                    // Assign next task
                    assignNextTask(task);
                    break;
            }
            
            taskRepository.save(task);
            log.info("✅ Task {} status updated: {} → {}", taskId, previousStatus, newStatus);
            
        } catch (Exception e) {
            log.error("Error updating task status: {}", taskId, e);
        }
    }
    
    /**
     * Auto-assign next task when current task completes
     */
    private void assignNextTask(Task completedTask) {
        try {
            // Find all tasks for this order
            List<Task> orderTasks = taskRepository.findByOrderId(completedTask.getOrderId())
                .stream()
                .sorted(Comparator.comparingInt(Task::getStageIndex))
                .collect(Collectors.toList());
            
            // Find next pending task
            Task nextTask = orderTasks.stream()
                .filter(t -> t.getStatus().equals("pending") && t.getStageIndex() > completedTask.getStageIndex())
                .findFirst()
                .orElse(null);
            
            if (nextTask != null) {
                assignTaskToAvailableStaff(nextTask);
                log.info("✅ Next task auto-assigned: {}", nextTask.getTaskId());
            } else {
                log.info("✅ All tasks completed for order: {}", completedTask.getOrderId());
            }
        } catch (Exception e) {
            log.error("Error assigning next task", e);
        }
    }
    
    /**
     * Send notification to staff member
     */
    private void sendTaskNotification(String staffId, Task task) {
        try {
            Notification notification = Notification.builder()
                .notificationId("NOTIF-" + System.currentTimeMillis())
                .staffId(staffId)
                .type("new-task")
                .title("New Task Assigned")
                .body("Task: " + task.getDescription() + " for Order: " + task.getOrderId())
                .data(new HashMap<String, Object>() {{
                    put("taskId", task.getTaskId());
                    put("orderId", task.getOrderId());
                    put("stage", task.getStage());
                    put("priority", task.getPriority());
                    put("estimatedTime", task.getEstimatedDuration());
                }})
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build();
            
            notificationRepository.save(notification);
            log.info("✅ Notification sent to staff: {}", staffId);
        } catch (Exception e) {
            log.error("Error sending notification", e);
        }
    }
    
    /**
     * Update staff workload
     */
    private void updateStaffWorkload(String staffId, int change) {
        Optional<Staff> optionalStaff = staffRepository.findByStaffId(staffId);
        if (optionalStaff.isPresent()) {
            Staff staff = optionalStaff.get();
            int currentWorkload = staff.getCurrentWorkload().getActiveTasks();
            staff.getCurrentWorkload().setActiveTasks(currentWorkload + change);
            
            // Auto update availability status
            if (currentWorkload + change >= staff.getCurrentWorkload().getMaxConcurrentTasks()) {
                staff.getAvailability().setStatus("busy");
            } else if (currentWorkload + change == 0) {
                staff.getAvailability().setStatus("available");
            }
            staff.getAvailability().setLastUpdated(LocalDateTime.now());
            
            staffRepository.save(staff);
        }
    }
    
    /**
     * Get required role for a task stage
     */
    private String getRequiredRole(String stage) {
        return switch (stage) {
            case "dye" -> "dyer";
            case "cutting" -> "cutter";
            case "stitching" -> "tailor";
            case "qc" -> "qc";
            case "delivery" -> "delivery";
            default -> "general";
        };
    }
    
    /**
     * Find appropriate workflow template
     */
    private WorkflowTemplate findWorkflowTemplate(String category, String subcategory) {
        // Try to find specific template for category + subcategory
        Optional<WorkflowTemplate> template = workflowTemplateRepository
            .findByCategoryAndSubcategoryAndIsActiveTrue(category, subcategory);
        
        // Fallback to category-only template
        if (template.isEmpty()) {
            template = workflowTemplateRepository
                .findByCategoryAndIsActiveTrue(category);
        }
        
        // Fallback to universal template
        if (template.isEmpty()) {
            template = workflowTemplateRepository
                .findByCategoryAndIsActiveTrue("all");
        }
        
        return template.orElse(null);
    }
}
