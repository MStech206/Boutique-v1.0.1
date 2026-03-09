package com.super_admin_backend.Entity;

import com.super_admin_backend.Enums.Role;
import jakarta.persistence.*;
import lombok.Data;
    @Data
    @Entity
    @Table(name = "admins")
    public class Admin {

    @Id
     private String id;

    private String name;

    @Column(unique = true)
    private String email;

    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private boolean active = true;

    private String branchId;



    }