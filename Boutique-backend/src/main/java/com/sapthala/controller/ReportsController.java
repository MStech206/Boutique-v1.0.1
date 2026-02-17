package com.sapthala.controller;

import com.sapthala.model.Task;
import com.sapthala.repository.TaskRepository;
import com.sapthala.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReportsController {

    private final TaskRepository taskRepository;
    private final OrderRepository orderRepository;

    /**
     * Search orders for reports.
     * Query params:
     * - filterBy: orderId | customer | phone | staff | all
     * - q: search value (required for orderId, customer, phone, staff)
     * - branch: optional branch filter
     */
    @GetMapping("/orders")
    public ResponseEntity<?> searchOrders(
            @RequestParam(required = false, defaultValue = "") String filterBy,
            @RequestParam(required = false, defaultValue = "") String q,
            @RequestParam(required = false, defaultValue = "") String branch
    ) {
        try {
            List<Task> tasks = new ArrayList<>();
            Set<String> branchOrderIds = new HashSet<>();

            // First, get orders from orders collection to build orderId set for filtering
            if (branch != null && !branch.isBlank()) {
                try {
                    List<Document> branchOrders = orderRepository.findByBranch(branch);
                    for (Document d : branchOrders) {
                        Object oid = d.get("orderId");
                        if (oid != null) branchOrderIds.add(oid.toString());
                    }
                    log.info("Found {} orders in branch: {}", branchOrderIds.size(), branch);
                } catch (Exception e) {
                    log.warn("Could not query orders collection for branch filter", e);
                }
            }

            // Search based on filterBy parameter
            if (!filterBy.isBlank()) {
                switch (filterBy.toLowerCase()) {
                    case "orderid":
                        if (!q.isBlank()) {
                            tasks = taskRepository.findByOrderId(q);
                        }
                        break;
                    case "customer":
                        if (!q.isBlank()) {
                            tasks = taskRepository.findByOrderDetailsCustomerNameContainingIgnoreCase(q);
                        }
                        break;
                    case "phone":
                        if (!q.isBlank()) {
                            tasks = taskRepository.findByOrderDetailsCustomerPhoneContaining(q);
                        }
                        break;
                    case "staff":
                        if (!q.isBlank()) {
                            tasks = taskRepository.findByAssignedToStaffId(q);
                        }
                        break;
                }
            } else {
                // No filter: return all tasks (paginate in production)
                tasks = taskRepository.findAll();
            }

            // If branch filter produced orderIds, restrict tasks
            if (!branchOrderIds.isEmpty()) {
                tasks = tasks.stream()
                        .filter(t -> t.getOrderId() != null && branchOrderIds.contains(t.getOrderId()))
                        .collect(Collectors.toList());
            }

            // Aggregate by orderId
            Map<String, List<Task>> tasksByOrder = tasks.stream()
                    .filter(t -> t.getOrderId() != null)
                    .collect(Collectors.groupingBy(Task::getOrderId));

            List<Map<String, Object>> results = new ArrayList<>();
            for (Map.Entry<String, List<Task>> e : tasksByOrder.entrySet()) {
                String orderId = e.getKey();
                List<Task> tlist = e.getValue();

                Task.OrderDetails od = tlist.stream()
                        .map(Task::getOrderDetails)
                        .filter(Objects::nonNull)
                        .findFirst()
                        .orElse(null);

                long total = tlist.size();
                long completed = tlist.stream().filter(t -> "completed".equals(t.getStatus())).count();
                long inProgress = tlist.stream().filter(t -> "in-progress".equals(t.getStatus())).count();
                long pending = tlist.stream().filter(t -> t.getStatus() == null || "pending".equals(t.getStatus()) || "assigned".equals(t.getStatus())).count();

                // Assigned staff for in-progress or assigned tasks
                List<Map<String, String>> assigned = tlist.stream()
                        .map(Task::getAssignedTo)
                        .filter(Objects::nonNull)
                        .map(a -> Map.of(
                                "staffId", a.getStaffId(),
                                "name", a.getName(),
                                "phone", a.getPhone(),
                                "role", a.getRole()
                        ))
                        .distinct()
                        .collect(Collectors.toList());

                double progress = total > 0 ? (completed * 100.0 / total) : 0;

                Map<String, Object> summary = new HashMap<>();
                summary.put("orderId", orderId);
                summary.put("customerName", od != null ? od.getCustomerName() : null);
                summary.put("customerPhone", od != null ? od.getCustomerPhone() : null);
                summary.put("garmentName", od != null ? od.getGarmentName() : null);
                summary.put("totalTasks", total);
                summary.put("completedTasks", completed);
                summary.put("inProgressTasks", inProgress);
                summary.put("pendingTasks", pending);
                summary.put("progress", progress);
                summary.put("assignedStaff", assigned);

                results.add(summary);
            }

            // Sort by progress desc then by orderId
            results.sort(Comparator.comparing((Map<String, Object> m) -> (Double) m.get("progress")).reversed());

            return ResponseEntity.ok(Map.of("success", true, "count", results.size(), "orders", results));

        } catch (Exception ex) {
            log.error("Error in searchOrders", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to search orders", "details", ex.getMessage()));
        }
    }

    /**
     * Get workflow/tasks for a specific order (drill-down)
     */
    @GetMapping("/order/{orderId}/workflow")
    public ResponseEntity<?> getOrderWorkflow(@PathVariable String orderId) {
        try {
            List<Task> tasks = taskRepository.findByOrderId(orderId);
            return ResponseEntity.ok(Map.of("success", true, "orderId", orderId, "tasks", tasks));
        } catch (Exception e) {
            log.error("Error fetching order workflow", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch workflow", "details", e.getMessage()));
        }
    }

    /**
     * Get last N orders with progress calculation
     */
    @GetMapping("/last-orders-custom")
    public ResponseEntity<?> getLastOrdersCustom(
            @RequestParam(required = false, defaultValue = "10") int limit,
            @RequestParam(required = false, defaultValue = "") String branch
    ) {
        try {
            Set<String> branchOrderIds = new HashSet<>();
            
            // Filter by branch if specified
            if (branch != null && !branch.isBlank() && !"all".equals(branch)) {
                try {
                    List<Document> branchOrders = orderRepository.findByBranch(branch);
                    for (Document d : branchOrders) {
                        Object oid = d.get("orderId");
                        if (oid != null) branchOrderIds.add(oid.toString());
                    }
                } catch (Exception e) {
                    log.warn("Could not query orders for branch filter", e);
                }
            } else {
                // Get all orders
                List<Document> allOrders = orderRepository.findAll();
                for (Document d : allOrders) {
                    Object oid = d.get("orderId");
                    if (oid != null) branchOrderIds.add(oid.toString());
                }
            }

            // Get all tasks
            List<Task> allTasks = taskRepository.findAll();
            
            // Filter tasks by branch orders
            List<Task> tasks = allTasks.stream()
                    .filter(t -> t.getOrderId() != null && branchOrderIds.contains(t.getOrderId()))
                    .collect(Collectors.toList());

            // Group by orderId
            Map<String, List<Task>> tasksByOrder = tasks.stream()
                    .filter(t -> t.getOrderId() != null)
                    .collect(Collectors.groupingBy(Task::getOrderId));

            List<Map<String, Object>> results = new ArrayList<>();
            for (Map.Entry<String, List<Task>> e : tasksByOrder.entrySet()) {
                String orderId = e.getKey();
                List<Task> tlist = e.getValue();

                // Get order details from orders collection
                Document orderDoc = orderRepository.findByOrderId(orderId);
                
                Task.OrderDetails od = tlist.stream()
                        .map(Task::getOrderDetails)
                        .filter(Objects::nonNull)
                        .findFirst()
                        .orElse(null);

                long total = tlist.size();
                long completed = tlist.stream().filter(t -> "completed".equals(t.getStatus())).count();
                double progress = total > 0 ? Math.round((completed * 100.0 / total) * 100.0) / 100.0 : 0;

                Map<String, Object> summary = new HashMap<>();
                summary.put("orderId", orderId);
                summary.put("date", orderDoc != null ? orderDoc.get("createdAt") : null);
                summary.put("customerName", od != null ? od.getCustomerName() : (orderDoc != null ? orderDoc.get("customerName") : null));
                summary.put("customerPhone", od != null ? od.getCustomerPhone() : (orderDoc != null ? orderDoc.get("customerPhone") : null));
                summary.put("garmentType", od != null ? od.getGarmentName() : (orderDoc != null ? orderDoc.get("garmentType") : null));
                summary.put("totalAmount", orderDoc != null ? orderDoc.get("totalAmount") : 0);
                summary.put("advanceAmount", orderDoc != null ? orderDoc.get("advanceAmount") : 0);
                summary.put("balanceAmount", orderDoc != null ? orderDoc.get("balanceAmount") : 0);
                summary.put("status", orderDoc != null ? orderDoc.get("status") : "pending");
                summary.put("branch", orderDoc != null ? orderDoc.get("branch") : branch);
                summary.put("progress", progress);
                summary.put("progressPercentage", progress);
                summary.put("totalTasks", total);
                summary.put("completedTasks", completed);

                results.add(summary);
            }

            // Sort by date desc and limit
            results.sort((a, b) -> {
                Object dateA = a.get("date");
                Object dateB = b.get("date");
                if (dateA == null) return 1;
                if (dateB == null) return -1;
                return dateB.toString().compareTo(dateA.toString());
            });
            
            List<Map<String, Object>> limitedResults = results.stream()
                    .limit(limit)
                    .collect(Collectors.toList());

            // Calculate summary
            double totalAmount = limitedResults.stream()
                    .mapToDouble(r -> ((Number) r.getOrDefault("totalAmount", 0)).doubleValue())
                    .sum();
            double totalAdvance = limitedResults.stream()
                    .mapToDouble(r -> ((Number) r.getOrDefault("advanceAmount", 0)).doubleValue())
                    .sum();
            double totalBalance = limitedResults.stream()
                    .mapToDouble(r -> ((Number) r.getOrDefault("balanceAmount", 0)).doubleValue())
                    .sum();

            Map<String, Object> summaryData = new HashMap<>();
            summaryData.put("totalOrders", limitedResults.size());
            summaryData.put("totalAmount", totalAmount);
            summaryData.put("totalAdvance", totalAdvance);
            summaryData.put("totalBalance", totalBalance);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orders", limitedResults,
                    "summary", summaryData
            ));

        } catch (Exception ex) {
            log.error("Error in getLastOrdersCustom", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate report", "details", ex.getMessage()));
        }
    }

    /**
     * Get branch-wise summary
     */
    @GetMapping("/branch-wise")
    public ResponseEntity<?> getBranchWiseSummary() {
        try {
            List<Document> allOrders = orderRepository.findAll();
            
            Map<String, Map<String, Object>> branchSummary = new HashMap<>();
            
            for (Document order : allOrders) {
                String branch = order.getString("branch");
                if (branch == null || branch.isBlank()) continue;
                
                branchSummary.putIfAbsent(branch, new HashMap<>());
                Map<String, Object> summary = branchSummary.get(branch);
                
                summary.put("branch", branch);
                summary.put("totalOrders", ((Number) summary.getOrDefault("totalOrders", 0)).intValue() + 1);
                
                double totalAmount = ((Number) summary.getOrDefault("totalAmount", 0.0)).doubleValue();
                totalAmount += ((Number) order.getOrDefault("totalAmount", 0)).doubleValue();
                summary.put("totalAmount", totalAmount);
                
                double totalAdvance = ((Number) summary.getOrDefault("totalAdvance", 0.0)).doubleValue();
                totalAdvance += ((Number) order.getOrDefault("advanceAmount", 0)).doubleValue();
                summary.put("totalAdvance", totalAdvance);
                
                double totalBalance = ((Number) summary.getOrDefault("totalBalance", 0.0)).doubleValue();
                totalBalance += ((Number) order.getOrDefault("balanceAmount", 0)).doubleValue();
                summary.put("totalBalance", totalBalance);
            }
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "branches", new ArrayList<>(branchSummary.values())
            ));
            
        } catch (Exception ex) {
            log.error("Error in getBranchWiseSummary", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate branch summary", "details", ex.getMessage()));
        }
    }
}
