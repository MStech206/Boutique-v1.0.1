package com.super_admin_backend.Repository;

import com.super_admin_backend.Entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BranchRepository  extends JpaRepository<Branch, String> {
}
