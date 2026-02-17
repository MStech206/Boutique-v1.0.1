package com.sapthala.repository;

import com.sapthala.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByStaffId(String staffId);
    List<Notification> findByStaffIdAndIsReadFalse(String staffId);
    List<Notification> findByStaffIdOrderByCreatedAtDesc(String staffId);
}
