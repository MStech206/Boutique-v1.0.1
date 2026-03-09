package com.super_admin_backend.Controller;

import com.super_admin_backend.Entity.BoutiqueAdmin;
import com.super_admin_backend.Service.SuperAdminService;
import com.super_admin_backend.dto.AdminDTO;
import com.super_admin_backend.dto.ChangePasswordRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/super-admin/admins")
public class SuperAdminController {
    private final SuperAdminService superAdminService;

    // ✅ Constructor injection
    public SuperAdminController(SuperAdminService superAdminService) {
        this.superAdminService = superAdminService;
    }

    // =========================
    // TEST ACCESS
    // =========================
    @GetMapping("/test")
    public String test() {
        return "✅ SUPER ADMIN ACCESS GRANTED";
    }

    // =========================
    // GET ALL ADMINS
    // =========================
    @GetMapping
    public List<AdminDTO> getAllAdmins() throws Exception {
        return superAdminService.getAllAdmins();
    }

    // =========================
    // GET ADMINS COUNT
    // =========================
    @GetMapping("/count")
    public Map<String, Long> getAdminsCount() throws Exception {
        return Map.of("count", superAdminService.countAdmins());
    }

    // =========================
    // GET ADMINS BY BOUTIQUE
    // =========================
    @GetMapping("/by-boutique/{clientId}")
    public List<AdminDTO> getAdminsByBoutique(
            @PathVariable String clientId
    ) throws Exception {
        return superAdminService.getAdminsByClient(clientId);
    }

    // =========================
    // ADD MAIN / BOUTIQUE ADMIN
    // =========================
    @PostMapping("/add/{clientId}")
    public BoutiqueAdmin addAdminToBoutique(
            @PathVariable String clientId,
            @RequestBody BoutiqueAdmin admin
    ) throws Exception {
        return superAdminService.addAdminToClient(clientId, admin);
    }

    // =========================
    // UPDATE ADMIN
    // =========================
    @PutMapping("/{adminId}")
    public BoutiqueAdmin updateAdmin(
            @PathVariable String adminId,
            @RequestBody BoutiqueAdmin admin
    ) throws Exception {
        return superAdminService.updateAdmin(adminId, admin);
    }

    // =========================
    // DELETE ADMIN (SAFE)
    // =========================
    @DeleteMapping("/{adminId}")
    public Map<String, String> deleteAdmin(
            @PathVariable String adminId
    ) throws Exception {

        superAdminService.deleteAdminSafely(adminId);

        return Map.of("message", "✅ Admin deleted successfully");
    }

    @GetMapping("/hierarchy/{clientId}")
    public Map<String, Object> getClientHierarchy(
            @PathVariable String clientId
    ) throws Exception {
        return superAdminService.getClientHierarchy(clientId);
    }

    // =========================
    // CHANGE ADMIN PASSWORD
    // =========================
    @PutMapping("/password")
    public Map<String, String> changeAdminPassword(
            @RequestBody ChangePasswordRequest request
    ) throws Exception {

        superAdminService.changeAdminPassword(
                String.valueOf(request.getAdminId()),
                request.getNewPassword()
        );

        return Map.of("message", "✅ Admin password updated successfully");
    }
}
