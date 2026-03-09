package com.super_admin_backend.Entity;

import jakarta.persistence.*;
import lombok.Data;


@Data
@Entity
@Table(name = "staff")

public class Staff {

    @Id
     private String id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "fcm_token")
    private String fcmToken;


}
