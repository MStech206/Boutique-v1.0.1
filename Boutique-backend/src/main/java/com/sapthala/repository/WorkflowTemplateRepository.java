package com.sapthala.repository;

import com.sapthala.model.WorkflowTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface WorkflowTemplateRepository extends MongoRepository<WorkflowTemplate, String> {
    Optional<WorkflowTemplate> findByTemplateId(String templateId);
    Optional<WorkflowTemplate> findByCategoryAndSubcategoryAndIsActiveTrue(String category, String subcategory);
    Optional<WorkflowTemplate> findByCategoryAndIsActiveTrue(String category);
}
