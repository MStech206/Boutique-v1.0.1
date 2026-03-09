package com.super_admin_backend.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
@Controller
public class SpaController {
    @RequestMapping(value = {
            "/",
            "/login",
            "/dashboard",
            "/admins",
            "/admins/**",
            "/clients",
            "/clients/**",
            "/vendors",
            "/vendors/**",
            "/users",
            "/users/**"
    })
    public String forward() {
        return "forward:/index.html";
    }
}

