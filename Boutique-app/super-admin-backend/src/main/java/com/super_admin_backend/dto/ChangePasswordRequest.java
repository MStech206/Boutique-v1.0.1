package com.super_admin_backend.dto;

import lombok.Data;

@Data
public class ChangePasswordRequest {
    private Long adminId;
    private String newPassword;
}
