package com.sapthala.controller;

import com.sapthala.model.Task;
import com.sapthala.model.Notification;
import com.sapthala.repository.*;
import com.sapthala.service.WorkflowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/workflow")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WorkflowController {
    
    private final WorkflowService workflowService;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    
    /**
     * Create workflow for a new order
     * POST /api/workflow/create-order-workflow
     */
    @PostMapping("/create-order-workflow")
    public ResponseEntity<?> createOrderWorkflow(@RequestBody Map<String, Object> request) {
        try {
            String orderId = (String) request.get("orderId");
            String category = (String) request.get("category");
            String subcategory = (String) request.get("subcategory");
            String garmentName = (String) request.get("garmentName");
            String customerName = (String) request.get("customerName");
            String customerPhone = (String) request.get("customerPhone");
            String deliveryDate = (String) request.get("deliveryDate");
            
            workflowService.createWorkflowForOrder(
                orderId, category, subcategory, garmentName, 
                customerName, customerPhone, deliveryDate
            );
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "✅ Workflow created successfully",
                "orderId", orderId
            ));
        } catch (Exception e) {
            log.error("Error creating workflow", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to create workflow", "details", e.getMessage()));
        }
    }
    
    /**
     * Update task status (Start, Pause, Resume, End)
     * PUT /api/workflow/task/{taskId}/status
     */
    @PutMapping("/task/{taskId}/status")
    public ResponseEntity<?> updateTaskStatus(
            @PathVariable String taskId,
            @RequestBody Map<String, String> request) {
        try {
            String newStatus = request.get("status"); // in-progress, paused, completed, failed
            String staffId = request.get("staffId");
            
            workflowService.updateTaskStatus(taskId, newStatus, staffId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "✅ Task status updated",
                "taskId", taskId,
                "status", newStatus
            ));
        } catch (Exception e) {
            log.error("Error updating task status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to update task status"));
        }
    }
    
    /**
     * Get task details
     * GET /api/workflow/task/{taskId}
     */
    @GetMapping("/task/{taskId}")
    public ResponseEntity<?> getTaskDetails(@PathVariable String taskId) {
        try {
            Optional<Task> task = taskRepository.findByTaskId(taskId);
            
            if (task.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Task not found"));
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "task", task.get()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch task"));
        }
    }
    
    /**
     * Get all tasks for a staff member
     * GET /api/workflow/staff/{staffId}/tasks
     */
    @GetMapping("/staff/{staffId}/tasks")
    public ResponseEntity<?> getStaffTasks(@PathVariable String staffId) {
        try {
            List<Task> tasks = taskRepository.findByAssignedToStaffId(staffId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "staffId", staffId,
                "tasks", tasks,
                "totalTasks", tasks.size(),
                "activeTasks", tasks.stream().filter(t -> t.getStatus().equals("in-progress")).count(),
                "completedTasks", tasks.stream().filter(t -> t.getStatus().equals("completed")).count(),
                "pendingTasks", tasks.stream().filter(t -> t.getStatus().equals("pending") || t.getStatus().equals("assigned")).count()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch staff tasks"));
        }
    }
    
    /**
     * Get all tasks for an order
     * GET /api/workflow/order/{orderId}/tasks
     */
    @GetMapping("/order/{orderId}/tasks")
    public ResponseEntity<?> getOrderTasks(@PathVariable String orderId) {
        try {
            List<Task> tasks = taskRepository.findByOrderId(orderId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "orderId", orderId,
                "tasks", tasks,
                "totalTasks", tasks.size(),
                "completedTasks", tasks.stream().filter(t -> t.getStatus().equals("completed")).count()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch order tasks"));
        }
    }
    
    /**
     * Get notifications for a staff member
     * GET /api/workflow/notifications/{staffId}
     */
    @GetMapping("/notifications/{staffId}")
    public ResponseEntity<?> getNotifications(@PathVariable String staffId) {
        try {
            List<Notification> notifications = notificationRepository
                .findByStaffIdOrderByCreatedAtDesc(staffId);
            
            List<Notification> unread = notificationRepository
                .findByStaffIdAndIsReadFalse(staffId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "staffId", staffId,
                "notifications", notifications,
                "totalNotifications", notifications.size(),
                "unreadCount", unread.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch notifications"));
        }
    }
    
    /**
     * Mark notification as read
     * PUT /api/workflow/notification/{notificationId}/read
     */
    @PutMapping("/notification/{notificationId}/read")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable String notificationId) {
        try {
            Optional<Notification> notification = notificationRepository.findById(notificationId);
            
            if (notification.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Notification not found"));
            }
            
            Notification notif = notification.get();
            notif.setIsRead(true);
            notif.setReadAt(java.time.LocalDateTime.now());
            notificationRepository.save(notif);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Notification marked as read"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to mark notification"));
        }
    }
    
    /**
     * Add photo to task
     * POST /api/workflow/task/{taskId}/photo
     */
    @PostMapping("/task/{taskId}/photo")
    public ResponseEntity<?> addTaskPhoto(
            @PathVariable String taskId,
            @RequestBody Map<String, String> request) {
        try {
            Optional<Task> optionalTask = taskRepository.findByTaskId(taskId);
            
            if (optionalTask.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Task not found"));
            }
            
            Task task = optionalTask.get();
            String photoUrl = request.get("photoUrl");
            String description = request.get("description");
            
            Task.TaskPhoto photo = Task.TaskPhoto.builder()
                .url(photoUrl)
                .capturedAt(java.time.LocalDateTime.now())
                .description(description)
                .build();
            
            if (task.getPhotos() == null) {
                task.setPhotos(new ArrayList<>());
            }
            task.getPhotos().add(photo);
            task.setUpdatedAt(java.time.LocalDateTime.now());
            
            taskRepository.save(task);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "✅ Photo added to task",
                "taskId", taskId,
                "photoCount", task.getPhotos().size()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to add photo"));
        }
    }
    
    /**
     * Get workflow progress for an order
     * GET /api/workflow/order/{orderId}/progress
     */
    @GetMapping("/order/{orderId}/progress")
    public ResponseEntity<?> getOrderProgress(@PathVariable String orderId) {
        try {
            List<Task> tasks = taskRepository.findByOrderId(orderId);
            
            int totalTasks = tasks.size();
            int completedTasks = (int) tasks.stream().filter(t -> t.getStatus().equals("completed")).count();
            int inProgressTasks = (int) tasks.stream().filter(t -> t.getStatus().equals("in-progress")).count();
            int pendingTasks = (int) tasks.stream().filter(t -> t.getStatus().equals("pending") || t.getStatus().equals("assigned")).count();
            
            double progress = totalTasks > 0 ? (completedTasks * 100.0 / totalTasks) : 0;
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "orderId", orderId,
                "progress", progress,
                "totalTasks", totalTasks,
                "completedTasks", completedTasks,
                "inProgressTasks", inProgressTasks,
                "pendingTasks", pendingTasks,
                "tasks", tasks
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch progress"));
        }
    }
}
