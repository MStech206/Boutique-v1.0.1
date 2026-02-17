package com.sapthala.repository;

import com.sapthala.model.Staff;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffRepository extends MongoRepository<Staff, String> {
    Optional<Staff> findByStaffId(String staffId);
    List<Staff> findByRole(String role);
    List<Staff> findByAvailabilityStatus(String status);
    List<Staff> findByIsActiveTrue();
    List<Staff> findByRoleAndIsActiveTrueAndAvailabilityStatus(String role, String status);
}
