package com.sapthala.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final com.sapthala.service.ProductService productService;

    public OrderController(com.sapthala.service.ProductService productService) {
        this.productService = productService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, String>> getOrder(@PathVariable String id) {
        // TODO: implement lookup
        return ResponseEntity.ok(Map.of("id", id, "status", "draft"));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody Map<String, Object> payload) {
        System.out.println("createOrder called with payload: " + payload);
        // Basic payload validation and inventory check
        List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
        if (items == null || items.isEmpty()) {
            System.out.println("createOrder: validation failed - items required");
            return ResponseEntity.badRequest().body(Map.of("error", "items required"));
        }

        // Check and reserve inventory (naive approach)
        for (Map<String, Object> it : items) {
            String sku = (String) it.get("sku");
            int qty = ((Number) it.getOrDefault("qty", 1)).intValue();
            boolean reserved = productService.reserve(sku, qty);
            System.out.println("Reserve attempt for sku=" + sku + " qty=" + qty + " -> " + reserved);
            if (!reserved) {
                System.out.println("createOrder: insufficient stock for sku=" + sku);
                return ResponseEntity.status(409).body(Map.of("error", "insufficient_stock", "sku", sku));
            }
        }

        // Persist order to Firestore
        String orderId = "order_" + System.currentTimeMillis();
        try {
            Map<String, Object> orderDoc = Map.of(
                    "orderId", orderId,
                    "items", items,
                    "status", "confirmed",
                    "createdAt", System.currentTimeMillis());
            com.google.cloud.firestore.Firestore db = com.google.firebase.cloud.FirestoreClient.getFirestore();
            db.collection("orders").document(orderId).set(orderDoc).get();
            System.out.println("createOrder: persisted orderId=" + orderId);
        } catch (Exception e) {
            System.err.println("createOrder: failed to persist: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "failed_to_persist", "detail", e.getMessage()));
        }

        return ResponseEntity.ok(Map.of("orderId", orderId, "status", "confirmed"));
    }
}
