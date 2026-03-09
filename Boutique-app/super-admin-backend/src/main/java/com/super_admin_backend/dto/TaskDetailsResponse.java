package com.super_admin_backend.dto;

import com.super_admin_backend.Enums.StaffRole;
import com.super_admin_backend.Enums.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;

import java.time.LocalDateTime;

@Data
@RequiredArgsConstructor
@AllArgsConstructor
public class TaskDetailsResponse {


    private String  taskId;
    private String taskName;
    private String orderId;

    private StaffRole currentRole;
    private TaskStatus status;

    private String assignedStaffUsername;

    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public TaskDetailsResponse(String taskId, String a, String b, String taskName) {
        this.taskId = taskId;
        this.taskName = taskName;
    }
}
