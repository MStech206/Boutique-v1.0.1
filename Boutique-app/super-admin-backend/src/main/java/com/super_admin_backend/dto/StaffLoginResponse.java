package com.super_admin_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StaffLoginResponse {
    private String token;
    private String username;


}
