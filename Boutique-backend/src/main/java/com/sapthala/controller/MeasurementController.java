package com.sapthala.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/measurements")
public class MeasurementController {

    @PostMapping
    public ResponseEntity<Map<String, Object>> saveMeasurement(@RequestBody Map<String, Object> body) {
        // Expected body: { uid, template: { id, measurements, photoUrls } }
        try {
            String id = (String) body.getOrDefault("id", "mt_" + System.currentTimeMillis());
            Map<String, Object> doc = Map.of(
                    "id", id,
                    "uid", body.getOrDefault("uid", ""),
                    "template", body.getOrDefault("template", Map.of()),
                    "createdAt", System.currentTimeMillis()
            );
            com.google.cloud.firestore.Firestore db = com.google.firebase.cloud.FirestoreClient.getFirestore();
            db.collection("measurements").document(id).set(doc).get();
            return ResponseEntity.ok(Map.of("status", "saved", "id", id));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "failed_to_save", "detail", e.getMessage()));
        }
    }
}