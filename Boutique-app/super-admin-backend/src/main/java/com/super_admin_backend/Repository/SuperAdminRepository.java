package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.SuperAdmin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SuperAdminRepository extends JpaRepository<SuperAdmin, String> {

    Optional<SuperAdmin> findByEmail(String email);
}
