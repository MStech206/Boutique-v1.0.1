package com.sapthala.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createPayment(@RequestBody Map<String, Object> body) {
        System.out.println("createPayment called with body: " + body);
        String orderId = (String) body.getOrDefault("orderId", "order_" + System.currentTimeMillis());
        double amount = ((Number) body.getOrDefault("amount", 0)).doubleValue();
        String productInfo = (String) body.getOrDefault("productInfo", "Sapthala Order");
        String firstname = (String) body.getOrDefault("firstname", "Customer");
        String email = (String) body.getOrDefault("email", "customer@example.com");

        String merchantKey = System.getenv("PAYU_MERCHANT_KEY");
        String merchantSalt = System.getenv("PAYU_MERCHANT_SALT");
        if (merchantKey == null || merchantSalt == null) {
            System.err.println("createPayment: missing PAYU credentials");
            return ResponseEntity.status(500).body(Map.of("error", "payu_credentials_missing"));
        }

        String txnid = "txn_" + System.currentTimeMillis();
        // Simple signature:
        // sha256(merchantKey|txnid|amount|productInfo|firstname|email|merchantSalt)
        String raw = String.format("%s|%s|%s|%s|%s|%s|%s", merchantKey, txnid, String.valueOf(amount), productInfo,
                firstname, email, merchantSalt);
        String signature = sha256(raw);
        System.out.println("createPayment: computed signature=" + signature + " for txnid=" + txnid);

        // Construct a pretend payUrl for dev. In production you'd redirect to PayU with
        // form POST.
        String payUrl = String.format(
                "https://sandbox.payu.in/_payment?key=%s&txnid=%s&amount=%s&productinfo=%s&firstname=%s&email=%s&hash=%s",
                merchantKey, txnid, amount, productInfo, firstname, email, signature);

        Map<String, Object> resp = Map.of(
                "status", "created",
                "paymentId", txnid,
                "orderId", orderId,
                "payUrl", payUrl);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyPayment(@RequestBody Map<String, Object> body) {
        System.out.println("verifyPayment called with body: " + body);
        // Verify signature & update order status
        String receivedHash = (String) body.getOrDefault("hash", "");
        String txnid = (String) body.getOrDefault("txnid", "");
        String status = (String) body.getOrDefault("status", "");

        String merchantKey = System.getenv("PAYU_MERCHANT_KEY");
        String merchantSalt = System.getenv("PAYU_MERCHANT_SALT");
        if (merchantKey == null || merchantSalt == null) {
            System.err.println("verifyPayment: missing PAYU credentials");
            return ResponseEntity.status(500).body(Map.of("error", "payu_credentials_missing"));
        }

        // Compute expected hash using known pattern
        String expectedRaw = String.format("%s|%s|%s", merchantKey, txnid, merchantSalt);
        String expected = sha256(expectedRaw);
        System.out.println("verifyPayment: expected=" + expected + " received=" + receivedHash);
        if (!expected.equals(receivedHash)) {
            System.err.println("verifyPayment: invalid signature");
            return ResponseEntity.status(400).body(Map.of("status", "invalid_signature"));
        }

        // Audit payment verification
        try {
            com.google.cloud.firestore.Firestore db = com.google.firebase.cloud.FirestoreClient.getFirestore();
            db.collection("audit_logs").add(Map.of(
                    "type", "payment_verification",
                    "txnid", txnid,
                    "status", status,
                    "receivedHash", receivedHash,
                    "timestamp", System.currentTimeMillis()));
            System.out.println("verifyPayment: audit log written for txnid=" + txnid);
        } catch (Exception e) {
            System.err.println("Failed to write audit log: " + e.getMessage());
            e.printStackTrace();
        }

        // TODO: update order/payment record
        return ResponseEntity.ok(Map.of("status", "verified", "txnid", txnid, "paymentStatus", status));
    }

    private String sha256(String input) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1)
                    hex.append('0');
                hex.append(h);
            }
            return hex.toString();
        } catch (Exception e) {
            return "";
        }
    }
}