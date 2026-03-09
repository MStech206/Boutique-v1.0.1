package com.super_admin_backend.Controller;

import com.super_admin_backend.Service.BoutiqueAdminService;
import com.super_admin_backend.Service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping( "/super-admin/activity")
public class ActivityController {

    private final BoutiqueAdminService adminService;
    private final UserService userService;

    public ActivityController(BoutiqueAdminService adminService, UserService userService) {
        this.adminService = adminService;
        this.userService = userService;
    }

    @GetMapping("/chart")
    public Map<String, Object> getActivityChart() {
        Map<String, Object> response = new HashMap<>();

        // Labels: Month names
        List<String> labels = Arrays.stream(Month.values())
                .map(m -> m.getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                .collect(Collectors.toList());

        // Active admins per month (dummy values for now, replace with Firestore query logic)
        List<Integer> activeAdmins = adminService.getActiveAdminsLast7Days(); // example method

        // Active users per month (dummy values for now, replace with Firestore query logic)
        List<Integer> activeUsers = userService.getActiveUsersLast7Days(); // example method

        response.put("labels", labels);
        response.put("activeAdmins", activeAdmins);
        response.put("activeUsers", activeUsers);

        return response;
    }
}
