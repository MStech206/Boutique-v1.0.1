package com.super_admin_backend.Controller;

import com.super_admin_backend.Entity.Task;
import com.super_admin_backend.Enums.StaffRole;
import com.super_admin_backend.Service.TaskService;
import com.super_admin_backend.dto.TaskDetailsResponse;
 import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
 import org.springframework.security.core.Authentication;
 import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
 @RestController
@RequestMapping("/api/staff/tasks")
public class TaskController {


    private TaskService taskService;

     public TaskController(TaskService taskService) {
         this.taskService = taskService;
     }

     @PostMapping("/create")
     public ResponseEntity<String> createTask(@RequestBody Map<String, Object> body) {

         String orderId = (String) body.get("orderId");
         String taskName = (String) body.get("taskName");


         List<String> workflowStrings = (List<String>) body.get("workflow");

         if (workflowStrings == null || workflowStrings.isEmpty()) {
             return ResponseEntity.badRequest().body("Workflow cannot be empty");
         }

         List<StaffRole> workflow = workflowStrings.stream()
                 .map(StaffRole::valueOf)
                 .toList();

         try {
             taskService.createTask(orderId, taskName, workflow);
         } catch (ExecutionException e) {
             throw new RuntimeException(e);
         } catch (InterruptedException e) {
             throw new RuntimeException(e);
         }

         return ResponseEntity.ok("Task created successfully");
     }


     // ---------------- Accept Task ----------------
     @PostMapping("/{orderId}/accept")
     public ResponseEntity<?> acceptTask(@PathVariable String orderId) {
         String username = getUsernameFromToken();

         try {
             Task task = taskService.acceptTask(orderId, username);

             return ResponseEntity.ok(Map.of(
                     "message", "Task accepted",
                     "orderId", orderId,
                     "status", task.getStatus()
             ));

         } catch (IllegalStateException e) {
             // Task already accepted / invalid state
             return ResponseEntity.status(HttpStatus.CONFLICT)
                     .body(Map.of("error", e.getMessage()));

         } catch (RuntimeException e) {
             return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                     .body(Map.of("error", e.getMessage()));
         }
     }


     // ---------------- Reject Task ----------------
     @PostMapping("/offer/reject")
     public ResponseEntity<String> rejectTask(@RequestBody Map<String, String> body) {
         String orderId = body.get("orderId");
         String username = getUsernameFromToken(); // get username from token
         taskService.handleRejectedTask(orderId, username);
         return ResponseEntity.ok("Task rejected and reassigned");
     }

     // ---------------- Pause Task ----------------
     @PostMapping("/{orderId}/pause")
     public ResponseEntity<String> pauseTask(@PathVariable String orderId) {
         taskService.pauseTask(orderId);
         return ResponseEntity.ok("Task paused successfully");
     }

     // ---------------- Resume Task ----------------
     @PostMapping("/{orderId}/resume")
     public ResponseEntity<String> resumeTask(@PathVariable String orderId) {
         taskService.resumeTask(orderId);
         return ResponseEntity.ok("Task resumed successfully");
     }

     // ---------------- Complete Task ----------------
     @PostMapping("/{orderId}/complete")
     public ResponseEntity<String> completeTask(@PathVariable String orderId) throws Exception {
         taskService.completeTask(orderId); // no currentStage needed
         return ResponseEntity.ok("Task completed successfully");
     }

     // ---------------- Task Details ----------------
     @GetMapping("/{orderId}/details")
     public TaskDetailsResponse getTaskDetails(@PathVariable String orderId) {
         String username = getUsernameFromToken();
         return taskService.getTaskDetailsFromLocal(new TaskDetailsResponse(orderId, null, null, username));
     }

     // ---------------- Available Tasks ----------------
     @GetMapping("/available")
     public List<Task> getAvailableTasks() throws ExecutionException, InterruptedException {
         String username = getUsernameFromToken();
         return taskService.getAvailableTasksForUser(username);
     }
     @GetMapping("/accepted")
     public ResponseEntity<List<Task>> getAcceptedTasks() throws ExecutionException, InterruptedException {
         String username = getUsernameFromToken(); // get username from JWT
         List<Task> tasks = taskService.getAcceptedTasksForUser(username);
         return ResponseEntity.ok(tasks);
     }
     // ---------------- Helper Method ----------------
     private String getUsernameFromToken() {
         var auth = SecurityContextHolder.getContext().getAuthentication();
         if (auth == null || auth.getName() == null) {
             throw new RuntimeException("Unauthorized");
         }
         return auth.getName();
     }
}
