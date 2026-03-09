package com.super_admin_backend.Config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.messaging.FirebaseMessaging;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Configuration
public class FirebaseConfig {

    @Value("${firebase.config.path}")
    private Resource firebaseConfig;

    @Value("${firebase.project-id}")
    private String projectId;

    private FirebaseApp firebaseApp;

    /**
     * 🔥 Initialize Firebase once at startup
     */
    @PostConstruct
    public void init() throws IOException {

        InputStream serviceAccount = firebaseConfig.getInputStream();

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .setProjectId(projectId)
                .build();

        List<FirebaseApp> apps = FirebaseApp.getApps();
        if (apps == null || apps.isEmpty()) {
            this.firebaseApp = FirebaseApp.initializeApp(options);
            System.out.println("🔥 Firebase initialized successfully");
        } else {
            this.firebaseApp = FirebaseApp.getInstance();
            System.out.println("ℹ️ Firebase already initialized");
        }
    }

    /**
     * ✅ FirebaseApp Bean
     */
    @Bean
    public FirebaseApp firebaseApp() {
        return firebaseApp;
    }

    /**
     * ✅ Firestore Bean
     */
    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        return FirestoreClient.getFirestore(firebaseApp);
    }

    /**
     * ✅ Firebase Cloud Messaging Bean
     */
    @Bean
    public FirebaseMessaging firebaseMessaging(FirebaseApp firebaseApp) {
        return FirebaseMessaging.getInstance(firebaseApp);
    }
}
