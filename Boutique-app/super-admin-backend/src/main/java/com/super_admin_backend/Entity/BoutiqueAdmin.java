package com.super_admin_backend.Entity;


 import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "boutique_admins")
public class BoutiqueAdmin {

    @Id
     private String id;
    @NonNull
    private String name;
    @NonNull
    private String email;
    @NonNull
    private String status;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role;

    private String mysqlId;
    private String  clientId;
    private String boutiqueName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt =LocalDateTime.now();

 }

