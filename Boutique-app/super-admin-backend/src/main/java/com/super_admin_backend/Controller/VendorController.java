package com.super_admin_backend.Controller;

import com.super_admin_backend.Entity.Vendor;
import com.super_admin_backend.Service.VendorService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/super-admin/vendors")
@CrossOrigin(origins = "http://localhost:5173")
public class VendorController {

    private final VendorService vendorService;

    // ✅ Constructor injection
    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    // ---------------- Get All Vendors ----------------
    @GetMapping
    public List<Vendor> getAllVendors() throws Exception {
        return vendorService.getAllVendors();
    }

    // ---------------- Get Vendor by ID ----------------
    @GetMapping("/{id}")
    public Vendor getVendor(@PathVariable String id) throws Exception {
        return vendorService.getVendorById(id); // Firestore String ID
    }

    // ---------------- Add Vendor ----------------
    @PostMapping
    public Vendor addVendor(@RequestBody Vendor vendor) throws Exception {
        return vendorService.saveVendor(vendor);
    }

    // ---------------- Update Vendor ----------------
    @PutMapping("/{id}")
    public Vendor updateVendor(@PathVariable String id, @RequestBody Vendor vendor) throws Exception {
        return vendorService.updateVendor(id, vendor);
    }

    // ---------------- Delete Vendor ----------------
    @DeleteMapping("/{id}")
    public Map<String, String> deleteVendor(@PathVariable String id) throws Exception {
        vendorService.deleteVendor(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Vendor deleted successfully");
        return response;
    }

    // ---------------- Count Vendors ----------------
    @GetMapping("/count")
    public Map<String, Long> getVendorsCount() throws Exception {
        long count = vendorService.countVendors(); // Firestore count
        return Map.of("count", count);
    }
}
