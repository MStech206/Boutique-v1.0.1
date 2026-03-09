package com.super_admin_backend.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    @Autowired
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String to, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("rakeshmadsumstech@gmail.com");
        message.setTo(to);
        message.setSubject("Super Admin Password Reset OTP");
        message.setText(
                "Your OTP is: " + otp +
                        "\nValid for 10 minutes.\nDo not share this OTP."
        );
        mailSender.send(message);
    }

}
