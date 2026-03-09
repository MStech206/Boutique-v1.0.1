package com.super_admin_backend.Service;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.*;
import com.super_admin_backend.Entity.Staff;
import com.super_admin_backend.Entity.Task;
import com.super_admin_backend.Enums.StaffRole;
import com.super_admin_backend.Enums.TaskStatus;
import com.super_admin_backend.Utility.RoleMapping;
import com.super_admin_backend.dto.TaskDetailsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final Firestore firestore;
    private final RoleMapping roleMapping;
    private final FirebaseStaffStatusService firebaseStaffStatusService;
    private final FcmNotificationService fcmNotificationService;

    private static final String STAFF_COLLECTION = "staffs";
    private static final String TASK_COLLECTION = "tasks";

    private static final List<StaffRole> WORKFLOW = List.of(
            StaffRole.DYEING,
            StaffRole.CUTTING,
            StaffRole.STITCHING,
            StaffRole.PAINTING,
            StaffRole.KHAKA,
            StaffRole.MAGGAM,
            StaffRole.QUALITY_CHECK
    );

    private StaffRole getNextRole(StaffRole current) {
        int i = WORKFLOW.indexOf(current);
        return (i == -1 || i == WORKFLOW.size() - 1) ? null : WORKFLOW.get(i + 1);
    }
    public void createTask(String orderId, String taskName, List<StaffRole> workflow) throws ExecutionException, InterruptedException {
        DocumentReference taskRef = firestore.collection(TASK_COLLECTION).document(orderId);
        DocumentSnapshot snapshot = taskRef.get().get(); // get document synchronously

        if (snapshot.exists()) {
            throw new RuntimeException("Duplicate order ID: " + orderId);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("orderId", orderId);
        data.put("taskName", taskName);
        data.put("workflow", workflow.stream().map(Enum::name).toList());
        data.put("currentStep", 0);

        StaffRole firstRole = workflow.get(0);

        data.put("stage", firstRole.name());
        data.put("status", TaskStatus.AVAILABLE.name());
        data.put("createdAt", Timestamp.now());
        data.put("assignedStaffId", null);
        data.put("startedAt", null);
        data.put("completedAt", null);

        firestore.collection(TASK_COLLECTION)
                .document(orderId)
                .set(data);

        // 🔥 Auto-offer ONLY first role
        autoOfferOldestPendingTask(firstRole);
    }

    // ================= ASSIGN TASK =================
    private Task assignTask(String orderId, Staff staff) {
        Map<String, Object> update = new HashMap<>();
        update.put("assignedStaffId", staff.getId()); // 🔑 Store as string
        update.put("status", TaskStatus.IN_PROGRESS.name());
        update.put("startedAt", Timestamp.now());

        firestore.collection(TASK_COLLECTION)
                .document(orderId)
                .set(update, SetOptions.merge());

        if (staff.getFcmToken() != null) {
            fcmNotificationService.sendTaskNotification(staff, orderId);
        }

        try {
            DocumentSnapshot snapshot = firestore.collection(TASK_COLLECTION)
                    .document(orderId)
                    .get()
                    .get();

            if (snapshot.exists()) {
                return convertSnapshotToTask(snapshot);
            } else {
                throw new RuntimeException("Task not found after assignment");
            }
        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Error fetching updated task", e);
        }
    }

    // ================= ACCEPT TASK =================
    public Task acceptTask(String orderId, String username) {
        try {
            DocumentReference taskRef =
                    firestore.collection(TASK_COLLECTION).document(orderId);

            return firestore.runTransaction(transaction -> {

                // 1️⃣ Fetch task
                DocumentSnapshot snap = transaction.get(taskRef).get();
                if (!snap.exists()) {
                    throw new IllegalStateException("Task not found");
                }

                String statusStr = snap.getString("status");
                if (statusStr == null) {
                    throw new IllegalStateException("Task status missing");
                }

                TaskStatus status = TaskStatus.valueOf(statusStr);

                // 🚫 Block double accept
                if (status != TaskStatus.AVAILABLE) {
                    throw new IllegalStateException("Task already accepted or completed");
                }

                // 2️⃣ Fetch staff
                QuerySnapshot staffSnapshot = firestore.collection(STAFF_COLLECTION)
                        .whereEqualTo("username", username)
                        .limit(1)
                        .get()
                        .get();

                if (staffSnapshot.isEmpty()) {
                    throw new IllegalStateException("Staff not found");
                }

                Staff staff = staffSnapshot.getDocuments().get(0).toObject(Staff.class);
                if (staff == null) {
                    throw new IllegalStateException("Staff data corrupted");
                }

                // 3️⃣ Update task
                Map<String, Object> update = new HashMap<>();
                update.put("assignedStaffId", username);
                update.put("status", TaskStatus.IN_PROGRESS.name());
                update.put("startedAt", Timestamp.now());
                update.put("completedAt", null);

                transaction.set(taskRef, update, SetOptions.merge());

                // 4️⃣ Return clean response object
                Task response = new Task();
                response.setId(orderId);
                response.setAssignedStaff(username);
                response.setStatus(TaskStatus.IN_PROGRESS);

                return response;

            }).get();

        } catch (IllegalStateException e) {
            throw e; // exact error for controller
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error accepting task");
        }
    }


    public Task completeTask(String orderId) {
        try {
            DocumentReference taskRef =
                    firestore.collection(TASK_COLLECTION).document(orderId);

            return firestore.runTransaction(transaction -> {

                DocumentSnapshot snapshot = transaction.get(taskRef).get();
                if (!snapshot.exists()) {
                    throw new RuntimeException("Task not found");
                }

                String status = snapshot.getString("status");

                // ✅ 1. Prevent double completion
                if (TaskStatus.COMPLETED.name().equals(status)) {
                    return convertSnapshotToTask(snapshot);
                }

                List<String> workflow = (List<String>) snapshot.get("workflow");
                Long stepLong = snapshot.getLong("currentStep");

                if (workflow == null || stepLong == null) {
                    throw new RuntimeException("Workflow data missing");
                }

                int currentStep = stepLong.intValue();
                int nextStep = currentStep + 1;

                Map<String, Object> update = new HashMap<>();
                update.put("assignedStaffId", null);
                update.put("completedAt", Timestamp.now());

                // ✅ 2. Final step → COMPLETE
                if (nextStep >= workflow.size()) {
                    update.put("status", TaskStatus.COMPLETED.name());
                }
                // 🔁 3. Move to next workflow step
                else {
                    update.put("currentStep", nextStep);
                    update.put("stage", workflow.get(nextStep));
                    update.put("status", TaskStatus.AVAILABLE.name());
                    update.put("startedAt", null);
                }

                transaction.set(taskRef, update, SetOptions.merge());

                // 🔕 Auto-offer should NEVER break completion
                if (nextStep < workflow.size()) {
                    try {
                        StaffRole nextRole = StaffRole.valueOf(workflow.get(nextStep));
                        autoOfferOldestPendingTask(nextRole);
                    } catch (Exception e) {
                        System.err.println("Auto-offer failed (ignored): " + e.getMessage());
                    }
                }

                return convertSnapshotToTask(snapshot);

            }).get();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error completing task", e);
        }
    }


    // ================= PAUSE / RESUME =================
    public void pauseTask(String orderId) {
        firestore.collection(TASK_COLLECTION)
                .document(orderId)
                .update("status", TaskStatus.PAUSED.name());
    }

    public void resumeTask(String orderId) {
        firestore.collection(TASK_COLLECTION)
                .document(orderId)
                .update("status", TaskStatus.IN_PROGRESS.name());
    }

    // ================= AUTO OFFER =================
    private void autoOfferOldestPendingTask(StaffRole role) {
        try {
            // 1️⃣ Oldest queued task
            QuerySnapshot taskSnapshot = firestore.collection(TASK_COLLECTION)
                    .whereEqualTo("status", TaskStatus.AVAILABLE.name())
                    .whereEqualTo("stage", role.name())
                    .orderBy("createdAt")
                    .limit(1)
                    .get()
                    .get();

            if (taskSnapshot.isEmpty()) return;

            DocumentSnapshot taskDoc = taskSnapshot.getDocuments().get(0);
            Task task = convertSnapshotToTask(taskDoc);
            if (task == null) return;

            // 2️⃣ Find an ONLINE staff
            QuerySnapshot staffSnapshot =
                    firestore.collection(STAFF_COLLECTION)
                            .whereEqualTo("role", role.name())
                            .whereEqualTo("active", true)
                            .get()
                            .get();

            Optional<Staff> freeStaff =
                    staffSnapshot.getDocuments().stream()
                            .map(doc -> doc.toObject(Staff.class))
                            .filter(staff ->
                                    firebaseStaffStatusService.isStaffOnline(staff.getId()))
                            .findFirst();

            // ❗ No staff free → task remains queued
            if (freeStaff.isEmpty()) {
                return;
            }

            Staff staff = freeStaff.get();

            // 3️⃣ Offer (do NOT assign yet)
            fcmNotificationService.sendTaskOfferNotification(staff, task.getId());

        } catch (Exception e) {
            // ❗ Do NOT break system for queue behavior
            System.err.println("Auto-offer failed: " + e.getMessage());
        }
    }

    // ================= REJECT / REASSIGN =================
    public void handleRejectedTask(String orderId, String username) {
        try {
            DocumentSnapshot snapshot = firestore.collection(TASK_COLLECTION)
                    .document(orderId)
                    .get()
                    .get();

            if (!snapshot.exists()) throw new RuntimeException("Task not found");

            Task task = convertSnapshotToTask(snapshot);

            Map<String, Object> update = new HashMap<>();
            update.put("assignedStaffId", null);
            update.put("startedAt", null);
            update.put("status", TaskStatus.AVAILABLE.name());

            firestore.collection(TASK_COLLECTION)
                    .document(orderId)
                    .set(update, SetOptions.merge());

            if (task.getStage() != null) {
                autoOfferOldestPendingTask(task.getStage());
            }

        } catch (InterruptedException | ExecutionException e) {
            throw new RuntimeException("Error handling rejected task", e);
        }
    }

    // ================= READ-ONLY (MySQL listener) =================
    public TaskDetailsResponse getTaskDetailsFromLocal(TaskDetailsResponse dto) {
        return dto;
    }

    // ================= AVAILABLE TASKS =================
    public List<Task> getAvailableTasksForUser(String username) throws ExecutionException, InterruptedException {
        StaffRole role = roleMapping.getRole(username);

        QuerySnapshot snapshot = firestore.collection(TASK_COLLECTION)
                .whereEqualTo("status", TaskStatus.AVAILABLE.name())
                .whereEqualTo("stage", role.name())
                .get()
                .get();

        List<Task> tasks = new ArrayList<>();
        for (QueryDocumentSnapshot doc : snapshot.getDocuments()) {
            tasks.add(convertSnapshotToTask(doc));
        }

        return tasks;
    }
    // ================= ACCEPTED TASKS FOR LOGGED-IN USER =================
    public List<Task> getAcceptedTasksForUser(String username) throws ExecutionException, InterruptedException {
        // Get staff role if needed (optional)
        // StaffRole role = roleMapping.getRole(username);

        QuerySnapshot snapshot = firestore.collection(TASK_COLLECTION)
                .whereEqualTo("assignedStaffId", username) // match assigned staff
                .whereIn("status", List.of(TaskStatus.IN_PROGRESS.name(), TaskStatus.PAUSED.name()))                .get()
                .get();

        List<Task> tasks = new ArrayList<>();
        for (QueryDocumentSnapshot doc : snapshot.getDocuments()) {
            tasks.add(convertSnapshotToTask(doc));
        }
        return tasks;
    }

    public List<Task> getAvailableTasksForRole() {
        List<Task> tasks = new ArrayList<>();
        try {
            QuerySnapshot snapshot = firestore.collection(TASK_COLLECTION)
                    .whereEqualTo("status", TaskStatus.AVAILABLE.name())
                    .get()
                    .get();

            for (QueryDocumentSnapshot doc : snapshot.getDocuments()) {
                tasks.add(convertSnapshotToTask(doc));
            }

        } catch (InterruptedException | ExecutionException e) {
            e.printStackTrace();
        }
        return tasks;
    }

    // ================= SNAPSHOT → TASK HELPER =================
    private Task convertSnapshotToTask(DocumentSnapshot snapshot) {
        Task task = new Task();
        task.setId(snapshot.getId());
        task.setFirestoreId(snapshot.getId());
        task.setTaskName(snapshot.getString("taskName"));
        task.setStatus(TaskStatus.valueOf(snapshot.getString("status")));
        task.setStage(StaffRole.valueOf(snapshot.getString("stage")));
        task.setOrderId(snapshot.getString("orderId"));
        task.setAssignedStaff(snapshot.getString("assignedStaffId")); // string ID

        // 🔹 Convert Firestore Timestamp → LocalDateTime safely
        Timestamp createdAt = snapshot.getTimestamp("createdAt");
        if (createdAt != null) {
            task.setCreatedAt(LocalDateTime.ofInstant(createdAt.toDate().toInstant(), ZoneId.systemDefault()));
        }

        Timestamp startedAt = snapshot.getTimestamp("startedAt");
        if (startedAt != null) {
            task.setStartedAt(LocalDateTime.ofInstant(startedAt.toDate().toInstant(), ZoneId.systemDefault()));
        }

        Timestamp completedAt = snapshot.getTimestamp("completedAt");
        if (completedAt != null) {
            task.setCompletedAt(LocalDateTime.ofInstant(completedAt.toDate().toInstant(), ZoneId.systemDefault()));
        }

        return task;
    }
}
