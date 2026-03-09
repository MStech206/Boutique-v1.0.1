package com.super_admin_backend.Controller;

import com.super_admin_backend.Service.StaffAuthService;
import com.super_admin_backend.dto.StaffLoginRequest;
import com.super_admin_backend.dto.StaffLoginResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/staff/auth")
public class StaffAuthController {

    private final StaffAuthService staffAuthService;

    public StaffAuthController(StaffAuthService staffAuthService) {
        this.staffAuthService = staffAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<StaffLoginResponse> login(@RequestBody StaffLoginRequest request) {
        // ✅ Delegate to Firestore service
        StaffLoginResponse response = staffAuthService.login(
                request.getUsername(),
                request.getPassword()
        );
        return ResponseEntity.ok(response);
    }
}
