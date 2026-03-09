package com.super_admin_backend.Entity;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import lombok.*;

import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Table(name = "clients")
public class Client {
    @Id
     private String id; // ✅ Firestore document ID

    @NonNull
    private String name;
    @Email
    private String email;
    @NonNull
    private String status;
    @NonNull
    private String boutiqueName;
    @NonNull
    private String address;

    private String mysqlId;
}
