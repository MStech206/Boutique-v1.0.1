package com.super_admin_backend.Entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "branch")
public class Branch {

    @Id
     private String id;

    private String name;
    private String location;

}
