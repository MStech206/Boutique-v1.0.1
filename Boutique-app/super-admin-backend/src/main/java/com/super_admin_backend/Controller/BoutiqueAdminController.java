package com.super_admin_backend.Controller;

import com.super_admin_backend.Entity.BoutiqueAdmin;
import com.super_admin_backend.Service.SuperAdminService;
import com.super_admin_backend.Service.BoutiqueAdminService;
import com.super_admin_backend.dto.AdminDTO;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
@RestController
@RequestMapping("/super-admin/admins") // 🔹 Match frontend API_URL
public class BoutiqueAdminController {

    private final BoutiqueAdminService adminService;
    private final SuperAdminService superAdminServiceAlt;

    public BoutiqueAdminController(BoutiqueAdminService adminService, SuperAdminService superAdminServiceAlt) {
        this.adminService = adminService;
        this.superAdminServiceAlt = superAdminServiceAlt;
    }

    // 🔹 GET all admins
    @GetMapping
    public List<AdminDTO> getAllAdmins() throws Exception {
        return adminService.getAllAdmins();
    }

    // 🔹 GET admin by ID
    @GetMapping("/{id}")
    public BoutiqueAdmin getAdmin(@PathVariable String id) throws Exception {
        return adminService.getAdminById(id);
    }

    // 🔹 ADD admin to a client
    @PostMapping("/add/{clientId}")
    public BoutiqueAdmin addAdminToClient(
            @PathVariable String clientId,
            @RequestBody BoutiqueAdmin admin
    ) throws Exception {

        return adminService.createAdminInternal(clientId, admin);
    }

    @PostMapping
    public BoutiqueAdmin createAdminFromDropdown(
            @RequestBody BoutiqueAdmin admin
    ) throws Exception {

        if (admin.getClientId() == null) {
            throw new IllegalArgumentException("clientId is required");
        }

        return adminService.createAdminInternal(
                admin.getClientId(),
                admin
        );
    }

    // 🔹 UPDATE admin
    @PutMapping("/{id}")
    public BoutiqueAdmin updateAdmin(@PathVariable String id, @RequestBody BoutiqueAdmin admin) throws Exception {
        return adminService.updateAdmin(id, admin);
    }

    // 🔹 DELETE admin
    @DeleteMapping("/{id}")
    public Map<String, String> deleteAdmin(@PathVariable String id) throws Exception {
        adminService.deleteAdmin(id);
        return Map.of("message", "Admin deleted successfully");
    }

    // 🔹 GET admins by client (optional, if frontend ever uses it)
    @GetMapping("/client/{clientId}")
    public List<AdminDTO> getAdminsByClient(@PathVariable String clientId) throws Exception {
        return superAdminServiceAlt.getAdminsByClient(clientId);
    }
}

