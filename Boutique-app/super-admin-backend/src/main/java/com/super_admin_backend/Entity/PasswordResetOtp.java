package com.super_admin_backend.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
@Data
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "password_reset_otp")
public class PasswordResetOtp {
    @Id
     private String id;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String otp; // hashed OTP

    @Column(nullable = false)
    private LocalDateTime expiryTime;

    @Column(nullable = false)
    private boolean used;

    public PasswordResetOtp(String email, String otp, LocalDateTime expiryTime) {
        this.email = email;
        this.otp = otp;
        this.expiryTime = expiryTime;
        this.used = false;
    }
}
