package com.sapthala.repository;

import com.sapthala.model.Task;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {
    Optional<Task> findByTaskId(String taskId);
    List<Task> findByOrderId(String orderId);
    List<Task> findByOrderDetailsCustomerNameContainingIgnoreCase(String customerName);
    List<Task> findByOrderDetailsCustomerPhoneContaining(String customerPhone);
    List<Task> findByAssignedToStaffId(String staffId);
    List<Task> findByStatus(String status);
    List<Task> findByStage(String stage);
    List<Task> findByAssignedToStaffIdAndStatus(String staffId, String status);
}
