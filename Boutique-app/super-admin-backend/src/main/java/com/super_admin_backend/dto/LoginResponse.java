package com.super_admin_backend.dto;
import lombok.*;

@Data
@AllArgsConstructor   // 👈 REQUIRED
@NoArgsConstructor
public class LoginResponse {

    private String  id;
    private String name;
    private String email;
    private String token;

    //for  branch admin login
    private String role;
    private String branchId;

    public LoginResponse(String token, String role, String branchId,String name,String email) {
        this.token = token;
        this.role = role;
        this.branchId = branchId;
        this.name=name;
        this.email=email;
    }
}