package com.super_admin_backend.Controller;

import com.super_admin_backend.Entity.Admin;
import com.super_admin_backend.Entity.Branch;
import com.super_admin_backend.Service.AdminService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('BRANCH_ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ✅ ADMIN PROFILE
    @GetMapping("/me")
    public Admin myProfile(Authentication auth) throws ExecutionException, InterruptedException {
        return adminService.getAdminByEmail(auth.getName());
    }

    // ✅ ADMIN'S OWN BRANCH ONLY
    @GetMapping("/branch")
    public String myBranch(Authentication auth) throws ExecutionException, InterruptedException {
        return adminService.getAdminBranch(auth.getName());
    }
}