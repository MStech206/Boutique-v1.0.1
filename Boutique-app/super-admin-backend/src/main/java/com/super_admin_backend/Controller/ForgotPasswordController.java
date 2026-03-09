package com.super_admin_backend.Controller;

import com.super_admin_backend.Service.ForgotPasswordService;
import com.super_admin_backend.dto.ForgotPasswordRequest;
import com.super_admin_backend.dto.ResetPasswordRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/auth")
public class ForgotPasswordController {

    private final ForgotPasswordService service;

    public ForgotPasswordController(ForgotPasswordService service) {
        this.service = service;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> sendOtp(@RequestBody ForgotPasswordRequest request) {
        try {
            service.sendOtp(request.getEmail());
            return ResponseEntity.ok("OTP sent to email");
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(500).body("Error sending OTP: " + e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            service.resetPassword(request.getEmail(), request.getOtp(), request.getNewPassword());
            return ResponseEntity.ok("Password updated successfully");
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(500).body("Error resetting password: " + e.getMessage());
        }
    }


    public record ApiResponse(String message) {}
}
