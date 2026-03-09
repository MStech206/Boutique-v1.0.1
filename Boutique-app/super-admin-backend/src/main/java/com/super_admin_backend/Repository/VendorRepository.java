package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface  VendorRepository extends JpaRepository<Vendor, String> {
}
