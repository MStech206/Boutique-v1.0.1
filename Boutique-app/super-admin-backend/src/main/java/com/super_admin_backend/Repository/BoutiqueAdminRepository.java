package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.BoutiqueAdmin;
import com.super_admin_backend.Entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BoutiqueAdminRepository extends JpaRepository<BoutiqueAdmin, String> {
    @Query("""
        SELECT COUNT(a)
        FROM BoutiqueAdmin a
        WHERE a.status = 'Active'
          AND DATE(a.createdAt) = :date
    """)
    Long countActiveAdminsByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(a) FROM BoutiqueAdmin a WHERE a.status = :status AND FUNCTION('MONTH', a.createdAt) = :month AND FUNCTION('YEAR', a.createdAt) = :year")
    long countByStatusAndCreatedAtMonth(@Param("status") String status, @Param("month") int month, @Param("year") int year);

    List<BoutiqueAdmin> findByClientId(String clientId);
    long countByClientId(String clientId);


    List<BoutiqueAdmin> findByStatus(String status);
    boolean existsByUsername(String username);

    BoutiqueAdmin findByUsername(String username);

}
