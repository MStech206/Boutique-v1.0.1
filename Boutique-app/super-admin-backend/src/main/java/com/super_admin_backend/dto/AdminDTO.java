package com.super_admin_backend.dto;

import com.super_admin_backend.Entity.BoutiqueAdmin;
import lombok.*;

@Data


@AllArgsConstructor
@NoArgsConstructor
public class AdminDTO {

    private String  id;
    private String name;
    private String email;
    private String username;
    private String status;
    private String  clientId;
    private String boutiqueName;


}
