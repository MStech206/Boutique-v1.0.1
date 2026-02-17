package com.sapthala.service;

import com.sapthala.model.Product;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class ProductService {
    private final ConcurrentMap<String, Product> products = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        // Sample products
        save(new Product("p1", "Classic Kurta", "Hand-tailored cotton kurta.", 1499.0, 12));
        save(new Product("p2", "Silk Saree", "Premium silk saree with zari.", 6999.0, 5));
        save(new Product("p3", "Men's Sherwani", "Custom-fit sherwani for special occasions.", 12999.0, 3));
    }

    public List<Product> findAll() {
        return new ArrayList<>(products.values());
    }

    public Product findById(String id) {
        return products.get(id);
    }

    public Product save(Product p) {
        products.put(p.getId(), p);
        return p;
    }

    public synchronized boolean reserve(String productId, int qty) {
        Product p = products.get(productId);
        if (p == null) return false;
        if (p.getInventoryCount() < qty) return false;
        p.setInventoryCount(p.getInventoryCount() - qty);
        products.put(productId, p);
        return true;
    }
}