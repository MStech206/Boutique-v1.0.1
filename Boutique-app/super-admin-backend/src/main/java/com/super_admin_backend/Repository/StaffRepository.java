package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.Staff;
import com.super_admin_backend.Enums.StaffRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StaffRepository  extends JpaRepository<Staff, String> {
    Optional<Staff> findByUsername(String username);
}
