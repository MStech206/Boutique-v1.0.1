package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderRepository extends JpaRepository <Order, String>{
    List<Order> findByClientId(Long clientId);

    // Find all orders by admin
    List<Order> findByAssignedAdminId(Long adminId);

    // Find orders by status
    List<Order> findByStatus(String status);

    @Query(value = "SELECT * FROM orders ORDER BY created_at DESC LIMIT :limit", nativeQuery = true)
    List<Order> findTopNByOrderByCreatedAtDesc(@Param("limit") int limit);
}
