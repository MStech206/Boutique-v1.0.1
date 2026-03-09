package com.super_admin_backend.Utility;

import com.super_admin_backend.Enums.StaffRole;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class RoleMapping {

    private static final Map<String, StaffRole> ROLE_MAP = new HashMap<>();

    static {
        // Assign role by username
        ROLE_MAP.put("dyeing1", StaffRole.DYEING);
         ROLE_MAP.put("cutting1", StaffRole.CUTTING);
        ROLE_MAP.put("stitching1", StaffRole.STITCHING);
        ROLE_MAP.put("khaka1", StaffRole.KHAKA);
        ROLE_MAP.put("maggam1", StaffRole.MAGGAM);
        ROLE_MAP.put("qc1", StaffRole.QUALITY_CHECK);
        ROLE_MAP.put("cutting2", StaffRole.CUTTING);

    }

    public StaffRole getRole(String username) {
        return ROLE_MAP.get(username); // return role based on username
    }
}
