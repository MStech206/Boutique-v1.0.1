package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    @Query("SELECT COUNT(u) FROM User u WHERE u.status = :status AND FUNCTION('MONTH', u.createdAt) = :month AND FUNCTION('YEAR', u.createdAt) = :year")
    long countByStatusAndCreatedAtMonth(@Param("status") String status, @Param("month") int month, @Param("year") int year);

}
