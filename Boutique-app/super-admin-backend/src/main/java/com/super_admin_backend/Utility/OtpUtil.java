package com.super_admin_backend.Utility;

import java.security.SecureRandom;

public class OtpUtil {
    public static String generateOtp() {
        return String.valueOf(
                100000 + new SecureRandom().nextInt(900000)
        );
    }
}
