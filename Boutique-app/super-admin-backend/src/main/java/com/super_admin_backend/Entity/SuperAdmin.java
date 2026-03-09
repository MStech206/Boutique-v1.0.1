package com.super_admin_backend.Entity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "super_admins")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SuperAdmin {
    @Id
 private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String name;
    private String status;

}
