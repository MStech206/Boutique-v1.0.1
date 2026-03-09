package com.super_admin_backend.Controller;

import com.super_admin_backend.Entity.User;
import com.super_admin_backend.Service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/super-admin/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserService userService;

    // ✅ Constructor injection
    public UserController(UserService userService) {
        this.userService = userService;
    }

    // ---------------- Get All Users ----------------
    @GetMapping
    public List<User> getAllUsers() throws Exception {
        return userService.getAllUsers();
    }

    // ---------------- Get User by ID ----------------
    @GetMapping("/{id}")
    public User getUser(@PathVariable String id) throws Exception {
        return userService.getUserById(id); // Firestore String ID
    }

    // ---------------- Add User ----------------
    @PostMapping
    public User addUser(@RequestBody User user) throws Exception {
        return userService.saveUser(user);
    }

    // ---------------- Update User ----------------
    @PutMapping("/{id}")
    public User updateUser(@PathVariable String id, @RequestBody User user) throws Exception {
        return userService.updateUser(id, user);
    }

    // ---------------- Delete User ----------------
    @DeleteMapping("/{id}")
    public Map<String, String> deleteUser(@PathVariable String id) throws Exception {
        userService.deleteUser(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "User deleted successfully");
        return response;
    }

    // ---------------- Count Users ----------------
    @GetMapping("/count")
    public Map<String, Long> getUsersCount() throws Exception {
        long count = userService.countUsers(); // Firestore count
        return Map.of("count", count);
    }
}
