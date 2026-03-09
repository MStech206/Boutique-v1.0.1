package com.super_admin_backend.Service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.AggregateQuerySnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.super_admin_backend.dto.DashboardStats;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class DashboardService {

    @Autowired
    private Firestore firestore;

    private static final String CLIENT_COLLECTION = "clients";
    private static final String ADMIN_COLLECTION = "boutique_admins";

    public DashboardStats getStats() throws ExecutionException, InterruptedException {

        DashboardStats stats = new DashboardStats();

        // 🚀 Run all queries in parallel
        ApiFuture<AggregateQuerySnapshot> totalClientsFuture =
                firestore.collection(CLIENT_COLLECTION)
                        .count()
                        .get();

        ApiFuture<AggregateQuerySnapshot> totalAdminsFuture =
                firestore.collection(ADMIN_COLLECTION)
                        .count()
                        .get();

        ApiFuture<AggregateQuerySnapshot> activeAdminsFuture =
                firestore.collection(ADMIN_COLLECTION)
                        .whereEqualTo("status", "Active")
                        .count()
                        .get();

        // ⏳ Wait only when needed
        long totalClients = totalClientsFuture.get().getCount();
        long totalAdmins = totalAdminsFuture.get().getCount();
        long activeAdmins = activeAdminsFuture.get().getCount();

        stats.setTotalClients(totalClients);
        stats.setTotalAdmins(totalAdmins);
        stats.setActiveAdmins(activeAdmins);
        stats.setInactiveAdmins(totalAdmins - activeAdmins);

        return stats;
    }
    // ✅ Example: active admins last 7 days
    // Replace dummy values with Firestore query using createdAt/status fields
    public List<Integer> getActiveAdminsLast7Days() {
        return List.of(2, 3, 4, 5, 3, 6, 4);
    }
}
