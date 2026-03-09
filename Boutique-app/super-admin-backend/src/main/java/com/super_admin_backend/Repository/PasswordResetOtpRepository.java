package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, String> {
    // 🔹 Validate OTP (email + otp + not expired)
    @Query("""
        SELECT o FROM PasswordResetOtp o
        WHERE o.email = :email
          AND o.otp = :otp
          AND o.expiryTime > :now
    """)
    Optional<PasswordResetOtp> findValidOtp(
            String email,
            String otp,
            LocalDateTime now
    );
    Optional<PasswordResetOtp>
    findTopByEmailAndUsedFalseOrderByExpiryTimeDesc(String email);

    // 🔹 Delete old OTPs for same email (best practice)
    void deleteByEmail(String email);
}



