package com.super_admin_backend.migration;

import com.super_admin_backend.Service.MySQLToFirestoreMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FirestoreMigrationRunner implements CommandLineRunner {
    private final MySQLToFirestoreMigrationService migrationService;

    @Override
    public void run(String... args) throws Exception {
     //  migrationService.migrateAll();
    }
}
