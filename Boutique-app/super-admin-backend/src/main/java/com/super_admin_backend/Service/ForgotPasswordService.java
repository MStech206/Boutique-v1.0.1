package com.super_admin_backend.Service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.super_admin_backend.Entity.PasswordResetOtp;
import com.super_admin_backend.Entity.SuperAdmin;
import com.super_admin_backend.Utility.OtpUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ExecutionException;

@Service
public class ForgotPasswordService {

    private final Firestore firestore;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final String OTP_COLLECTION = "password_reset_otps";
    private static final String SUPER_ADMIN_COLLECTION = "super_admins";

    public ForgotPasswordService(Firestore firestore,
                                 EmailService emailService,
                                 PasswordEncoder passwordEncoder) {
        this.firestore = firestore;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    // ================= SEND OTP =================
    public void sendOtp(String email) throws ExecutionException, InterruptedException {
        // 🔒 Ensure super admin exists
        DocumentSnapshot adminSnap = firestore.collection(SUPER_ADMIN_COLLECTION)
                .whereEqualTo("email", email)
                .get().get().getDocuments()
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException("Email not registered"));

        // 🔁 Prevent OTP spam (reuse if still valid)
        var existingOtpDocs = firestore.collection(OTP_COLLECTION)
                .whereEqualTo("email", email)
                .whereEqualTo("used", false)
                .orderBy("expiryTime", com.google.cloud.firestore.Query.Direction.DESCENDING)
                .get().get().getDocuments();

        if (!existingOtpDocs.isEmpty()) {
            PasswordResetOtp existingOtp = existingOtpDocs.get(0).toObject(PasswordResetOtp.class);
            if (existingOtp != null && existingOtp.getExpiryTime().isAfter(LocalDateTime.now())) {
                throw new RuntimeException("OTP already sent. Please wait.");
            }
        }

        // 🧹 Cleanup old OTPs
        existingOtpDocs.forEach(doc -> doc.getReference().delete());

        // 🔢 Generate OTP
        String otp = OtpUtil.generateOtp();

        PasswordResetOtp entity = new PasswordResetOtp();
        entity.setEmail(email);
        entity.setOtp(passwordEncoder.encode(otp));
        entity.setExpiryTime(LocalDateTime.now().plusMinutes(10));
        entity.setUsed(false);

        firestore.collection(OTP_COLLECTION).add(entity).get();

        // 📧 Send email
        emailService.sendOtpEmail(email, otp);
    }

    // ================= RESET PASSWORD =================
    public void resetPassword(String email, String otp, String newPassword) throws ExecutionException, InterruptedException {
        var otpDocs = firestore.collection(OTP_COLLECTION)
                .whereEqualTo("email", email)
                .whereEqualTo("used", false)
                .orderBy("expiryTime", com.google.cloud.firestore.Query.Direction.DESCENDING)
                .get().get().getDocuments();

        if (otpDocs.isEmpty()) throw new RuntimeException("OTP not found");

        DocumentSnapshot otpDoc = otpDocs.get(0);
        PasswordResetOtp savedOtp = otpDoc.toObject(PasswordResetOtp.class);

        if (savedOtp == null || savedOtp.getExpiryTime().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP expired");
        }

        if (!passwordEncoder.matches(otp, savedOtp.getOtp())) {
            throw new RuntimeException("Invalid OTP");
        }

        // ✅ Update SuperAdmin password
        var adminDocs = firestore.collection(SUPER_ADMIN_COLLECTION)
                .whereEqualTo("email", email)
                .get().get().getDocuments();

        if (adminDocs.isEmpty()) throw new RuntimeException("Admin not found");

        DocumentReference adminRef = adminDocs.get(0).getReference();
        SuperAdmin admin = adminDocs.get(0).toObject(SuperAdmin.class);
        admin.setPassword(passwordEncoder.encode(newPassword));
        adminRef.set(admin).get();

        // ✅ Invalidate OTP
        savedOtp.setUsed(true);
        otpDoc.getReference().set(savedOtp).get();
    }
}
