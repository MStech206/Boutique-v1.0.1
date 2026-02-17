package com.sapthala.controller;

import com.sapthala.model.Product;
import com.sapthala.service.ProductService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<Product>> list() {
        return ResponseEntity.ok(productService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        Product p = productService.findById(id);
        if (p == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(p);
    }

    @PostMapping("/{id}/reserve")
    public ResponseEntity<Map<String, Object>> reserve(@PathVariable String id, @RequestParam(defaultValue = "1") int qty) {
        boolean ok = productService.reserve(id, qty);
        if (!ok) return ResponseEntity.status(409).body(Map.of("status", "insufficient_stock"));
        return ResponseEntity.ok(Map.of("status", "reserved", "productId", id, "qty", qty));
    }
}
