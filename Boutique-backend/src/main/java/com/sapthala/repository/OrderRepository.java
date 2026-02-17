package com.sapthala.repository;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;
import java.util.*;

/**
 * Custom repository for order queries against MongoDB orders collection.
 * Supports filtering by branch, search, date range, and more.
 */
@Repository
public class OrderRepository {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    /**
     * Find orders by branch
     */
    public List<Document> findByBranch(String branch) {
        Query query = new Query(Criteria.where("branch").is(branch));
        return mongoTemplate.find(query, Document.class, "orders");
    }
    
    /**
     * Search orders by order ID
     */
    public Document findByOrderId(String orderId) {
        Query query = new Query(Criteria.where("orderId").is(orderId));
        return mongoTemplate.findOne(query, Document.class, "orders");
    }
    
    /**
     * Search orders by customer name (case-insensitive)
     */
    public List<Document> findByCustomerName(String customerName) {
        Query query = new Query(
            new Criteria().orOperator(
                Criteria.where("customer.name").regex(customerName, "i"),
                Criteria.where("customerName").regex(customerName, "i")
            )
        );
        return mongoTemplate.find(query, Document.class, "orders");
    }
    
    /**
     * Search orders by customer phone
     */
    public List<Document> findByCustomerPhone(String phone) {
        Query query = new Query(
            new Criteria().orOperator(
                Criteria.where("customer.phone").is(phone),
                Criteria.where("customerPhone").is(phone),
                Criteria.where("customer.phone").regex(phone, "")
            )
        );
        return mongoTemplate.find(query, Document.class, "orders");
    }
    
    /**
     * Search orders by branch and order ID
     */
    public List<Document> findByBranchAndOrderId(String branch, String orderId) {
        Query query = new Query(
            Criteria.where("branch").is(branch)
                    .and("orderId").is(orderId)
        );
        return mongoTemplate.find(query, Document.class, "orders");
    }
    
    /**
     * Search orders by branch and customer name
     */
    public List<Document> findByBranchAndCustomerName(String branch, String customerName) {
        Query query = new Query(
            Criteria.where("branch").is(branch)
                    .andOperator(
                        new Criteria().orOperator(
                            Criteria.where("customer.name").regex(customerName, "i"),
                            Criteria.where("customerName").regex(customerName, "i")
                        )
                    )
        );
        return mongoTemplate.find(query, Document.class, "orders");
    }
    
    /**
     * Search orders with flexible filters
     */
    public List<Document> search(Map<String, Object> filters) {
        List<Criteria> criteriaList = new ArrayList<>();
        
        if (filters.containsKey("branch") && filters.get("branch") != null) {
            criteriaList.add(Criteria.where("branch").is(filters.get("branch")));
        }
        if (filters.containsKey("orderId") && filters.get("orderId") != null) {
            criteriaList.add(Criteria.where("orderId").is(filters.get("orderId")));
        }
        if (filters.containsKey("customerName") && filters.get("customerName") != null) {
            String name = filters.get("customerName").toString();
            criteriaList.add(
                new Criteria().orOperator(
                    Criteria.where("customer.name").regex(name, "i"),
                    Criteria.where("customerName").regex(name, "i")
                )
            );
        }
        if (filters.containsKey("customerPhone") && filters.get("customerPhone") != null) {
            criteriaList.add(
                new Criteria().orOperator(
                    Criteria.where("customer.phone").is(filters.get("customerPhone")),
                    Criteria.where("customerPhone").is(filters.get("customerPhone")),
                    Criteria.where("customer.phone").regex(filters.get("customerPhone").toString(), "")
                )
            );
        }
        if (filters.containsKey("status") && filters.get("status") != null) {
            criteriaList.add(Criteria.where("currentStage").is(filters.get("status")));
        }
        
        Query query;
        if (criteriaList.isEmpty()) {
            query = new Query();
        } else if (criteriaList.size() == 1) {
            query = new Query(criteriaList.get(0));
        } else {
            query = new Query(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        }
        
        return mongoTemplate.find(query, Document.class, "orders");
    }
    
    /**
     * Get all orders
     */
    public List<Document> findAll() {
        return mongoTemplate.findAll(Document.class, "orders");
    }
}
