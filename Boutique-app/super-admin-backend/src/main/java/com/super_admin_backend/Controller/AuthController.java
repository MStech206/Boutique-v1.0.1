package com.super_admin_backend.Controller;
import com.super_admin_backend.Service.AuthService;
import com.super_admin_backend.dto.LoginRequest;
import com.super_admin_backend.dto.LoginResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
 public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        System.out.println("🔥 AuthController /login HIT");
        return authService.login(request);
    }


}
