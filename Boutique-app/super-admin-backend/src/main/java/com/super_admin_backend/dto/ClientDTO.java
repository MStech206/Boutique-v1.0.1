package com.super_admin_backend.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClientDTO {

    private String id;
    private String name;
    private String email;
    private String status;
    private String boutiqueName;
    private String address;
    private long numberOfAdmins;   // ✅ numeric count
}
