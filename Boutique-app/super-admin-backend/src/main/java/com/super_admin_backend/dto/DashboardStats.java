package com.super_admin_backend.dto;

import lombok.Data;

@Data
public class DashboardStats {
    private long totalClients;
    private long totalAdmins;
    private long activeAdmins;
    private long inactiveAdmins;

}
