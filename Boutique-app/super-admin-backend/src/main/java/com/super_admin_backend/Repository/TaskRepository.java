package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.Staff;
import com.super_admin_backend.Entity.Task;
import com.super_admin_backend.Enums.StaffRole;
import com.super_admin_backend.Enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, String> {
    List<Task> findByAssignedStaffAndStatusIn(
            Staff staff,
            List<TaskStatus> statuses
    );
    long countByAssignedStaffAndStatusIn(
            Staff staff,
            List<TaskStatus> statuses
    );
    Task findFirstBystageAndStatusOrderByCreatedAtAsc(
            StaffRole role,
            TaskStatus status
    );
    Optional<Task> findByFirestoreId(String firestoreId);
    Optional<Task> findByOrderId(String orderId);
    void deleteByFirestoreId(String firestoreId);

    List<Task> findByStageAndStatus(StaffRole role, TaskStatus status);
    List<Task> findByAssignedStaff(Staff staff);

    boolean existsByOrderId(String orderId);
}
