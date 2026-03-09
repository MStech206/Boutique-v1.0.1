package com.super_admin_backend.Controller;

import com.super_admin_backend.Service.DashboardService;
import com.super_admin_backend.dto.DashboardStats;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/super-admin/dashboard/")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    // 🔹 Stats cards
    @GetMapping("/stats")
    public DashboardStats getDashboardStats() throws Exception {
        return dashboardService.getStats();
    }

    // 🔹 Chart
    @GetMapping("/active-admins-last-7-days")
    public List<Integer> getActiveAdminsChart() {
        return dashboardService.getActiveAdminsLast7Days();
    }
}
