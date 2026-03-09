package com.super_admin_backend.dto;

import jakarta.validation.Valid;
import lombok.Data;
import lombok.Getter;

@Data
@Getter
public class ForgotPasswordRequest {
    @Valid
    private String email;
}
