package com.super_admin_backend.Service;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.super_admin_backend.Entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private Firestore firestore;

    private static final String USER_COLLECTION = "users";

    // Get all users
    public List<User> getAllUsers() throws ExecutionException, InterruptedException {
        QuerySnapshot snapshot = firestore.collection(USER_COLLECTION).get().get();
        return snapshot.getDocuments().stream()
                .map(doc -> doc.toObject(User.class))
                .collect(Collectors.toList());
    }

    // Get user by ID
    public User getUserById(String id) throws ExecutionException, InterruptedException {
        DocumentSnapshot snapshot = firestore.collection(USER_COLLECTION).document(id).get().get();
        if (!snapshot.exists()) {
            throw new RuntimeException("User not found with id: " + id);
        }
        return snapshot.toObject(User.class);
    }

    // Save new user
    public User saveUser(User user) throws ExecutionException, InterruptedException {
        firestore.collection(USER_COLLECTION).document(user.getId()).set(user).get();
        return user;
    }

    // Update user
    public User updateUser(String id, User updatedUser) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection(USER_COLLECTION).document(id);
        DocumentSnapshot snapshot = docRef.get().get();

        if (!snapshot.exists()) {
            throw new RuntimeException("User not found with id: " + id);
        }

        User user = snapshot.toObject(User.class);
        user.setName(updatedUser.getName());
        user.setEmail(updatedUser.getEmail());
        user.setStatus(updatedUser.getStatus());

        docRef.set(user).get();
        return user;
    }

    // Delete user
    public void deleteUser(String id) throws ExecutionException, InterruptedException {
        firestore.collection(USER_COLLECTION).document(id).delete().get();
    }

    // Count users
    public long countUsers() throws ExecutionException, InterruptedException {
        QuerySnapshot snapshot = firestore.collection(USER_COLLECTION).get().get();
        return snapshot.size();
    }

    // Example: last 7 days active users counts (dummy values)
    public List<Integer> getActiveUsersLast7Days() {
        // TODO: Replace with Firestore query logic
        return List.of(20, 25, 22, 30, 28, 26, 29);
    }
}
