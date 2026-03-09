package com.super_admin_backend.Utility;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentChange;
import com.google.cloud.firestore.Firestore;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.super_admin_backend.Entity.*;
import com.super_admin_backend.Enums.TaskStatus;
import com.super_admin_backend.Enums.StaffRole;
import com.super_admin_backend.Repository.*;

import java.time.ZoneId;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class FirestoreSyncListener {

    private final Firestore firestore;

    private final ClientRepository clientRepo;
    private final UserRepository userRepo;
    private final VendorRepository vendorRepo;
    private final BoutiqueAdminRepository adminRepo;
    private final StaffRepository staffRepo;
    private final TaskRepository taskRepo;
    private final PasswordResetOtpRepository otpRepo;
    private final SuperAdminRepository superAdminRepo;
    private final OrderRepository orderRepo;

    // ================= INIT =================
    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        listenClients();
        //listenUsers();
        //listenVendors();
        listenAdmins();
        listenStaffs();
        listenTasks();
        listenOtps();
        listenSuperAdmins();
        listenOrders();
        System.out.println("🔥 Firestore listeners attached successfully");
    }

    // ================= COMMON HELPERS =================
    private void logError(String collection, Exception e) {
        System.err.println("❌ Firestore error in [" + collection + "]");
        e.printStackTrace();
    }

    private void applyTimestamp(Timestamp ts, java.util.function.Consumer<java.time.LocalDateTime> setter) {
        if (ts != null) {
            setter.accept(
                    ts.toDate().toInstant()
                            .atZone(ZoneId.systemDefault())
                            .toLocalDateTime()
            );
        }
    }

    // ================= CLIENTS =================
    private void listenClients() {
        firestore.collection("clients").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("clients", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        clientRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    Client client = clientRepo.findById(id).orElse(new Client());
                    client.setId(id);
                    client.setName((String) d.get("name"));
                    client.setEmail((String) d.get("email"));
                    client.setStatus((String) d.get("status"));
                    client.setBoutiqueName((String) d.get("boutiqueName"));
                    client.setAddress((String) d.get("address"));

                    clientRepo.saveAndFlush(client);
                    System.out.println("✅ Client synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }

    // ================= USERS =================
    /*private void listenUsers() {
        firestore.collection("users").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("users", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        userRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    User user = userRepo.findById(id).orElse(new User());
                    user.setId(id);
                    user.setName((String) d.get("name"));
                    user.setEmail((String) d.get("email"));
                    user.setStatus((String) d.get("status"));

                    applyTimestamp((Timestamp) d.get("createdAt"), user::setCreatedAt);

                    userRepo.saveAndFlush(user);
                    System.out.println("✅ User synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }

    // ================= VENDORS =================
    private void listenVendors() {
        firestore.collection("vendors").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("vendors", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        vendorRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    Vendor vendor = vendorRepo.findById(id).orElse(new Vendor());
                    vendor.setId(id);
                    vendor.setName((String) d.get("name"));
                    vendor.setEmail((String) d.get("email"));
                    vendor.setStatus((String) d.get("status"));

                    vendorRepo.saveAndFlush(vendor);
                    System.out.println("✅ Vendor synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }
*/
    // ================= ADMINS =================
    private void listenAdmins() {
        firestore.collection("boutique_admins").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("boutique_admins", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        adminRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    BoutiqueAdmin admin = adminRepo.findById(id).orElse(new BoutiqueAdmin());
                    admin.setId(id);
                    admin.setName((String) d.get("name"));
                    admin.setEmail((String) d.get("email"));
                    admin.setUsername((String) d.get("username"));
                    admin.setPassword((String) d.get("password"));
                    admin.setStatus((String) d.get("status"));
                    admin.setRole((String) d.get("role"));

                    applyTimestamp((Timestamp) d.get("createdAt"), admin::setCreatedAt);

                    adminRepo.saveAndFlush(admin);
                    System.out.println("✅ Admin synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }

    // ================= STAFF =================
    private void listenStaffs() {
        firestore.collection("staffs").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("staffs", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        staffRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    Staff staff = staffRepo.findById(id).orElse(new Staff());
                    staff.setId(id);
                    staff.setUsername((String) d.get("username"));
                    staff.setPassword((String) d.get("password"));
                    staff.setFcmToken((String) d.get("fcmToken"));

                    staffRepo.saveAndFlush(staff);
                    System.out.println("✅ Staff synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }

    // ================= TASKS =================
    private void listenTasks() {
        firestore.collection("tasks").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("tasks", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();
                    Map<String, Object> d = c.getDocument().getData();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        taskRepo.deleteById(id);
                        continue;
                    }

                    String orderId = (String) d.get("orderId");
                    if (orderId == null || orderId.isBlank()) {
                        System.err.println("⚠️ Skipping task (orderId missing): " + id);
                        continue;
                    }

                    Task task = taskRepo.findById(id).orElse(new Task());
                    task.setId(id);
                    task.setOrderId(orderId);
                    task.setTaskName((String) d.get("taskName"));

                    try {
                        task.setStatus(TaskStatus.valueOf(((String) d.get("status")).toUpperCase()));
                    } catch (Exception ignored) {}

                    try {
                        task.setStage(StaffRole.valueOf(((String) d.get("stage")).toUpperCase()));
                    } catch (Exception ignored) {}

                    applyTimestamp((Timestamp) d.get("createdAt"), task::setCreatedAt);
                    applyTimestamp((Timestamp) d.get("createdAt"), task::setCreatedAt);
                    applyTimestamp((Timestamp) d.get("startedAt"), task::setStartedAt);
                    applyTimestamp((Timestamp) d.get("completedAt"), task::setCompletedAt);

                    taskRepo.saveAndFlush(task);
                    System.out.println("✅ Task synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }

    // ================= OTPS =================
    private void listenOtps() {
        firestore.collection("password_reset_otps").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("password_reset_otps", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        otpRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    PasswordResetOtp otp = otpRepo.findById(id).orElse(new PasswordResetOtp());
                    otp.setId(id);
                    otp.setEmail((String) d.get("email"));

                    String otpValue = (String) d.get("otp");
                    if (otpValue == null || otpValue.isBlank()) {
                        System.err.println("⚠️ Skipping OTP with null otp: " + id);
                        continue;
                    }

                    otp.setOtp(otpValue);
                    otp.setUsed(Boolean.TRUE.equals(d.get("used")));
                    applyTimestamp((Timestamp) d.get("expiryTime"), otp::setExpiryTime);

                    otpRepo.saveAndFlush(otp);

                    System.out.println("✅ OTP synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }

    // ================= SUPER ADMINS =================
    private void listenSuperAdmins() {
        firestore.collection("super_admins").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("super_admins", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        superAdminRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    SuperAdmin sa = superAdminRepo.findById(id).orElse(new SuperAdmin());
                    sa.setId(id);
                    sa.setName((String) d.get("name"));
                    sa.setEmail((String) d.get("email"));
                    sa.setPassword((String) d.get("password"));
                    sa.setStatus((String) d.get("status"));

                    superAdminRepo.saveAndFlush(sa);
                    System.out.println("✅ SuperAdmin synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }

    // ================= ORDERS =================
    private void listenOrders() {
        firestore.collection("orders").addSnapshotListener((snapshots, e) -> {
            if (e != null) { logError("orders", e); return; }
            if (snapshots == null) return;

            for (DocumentChange c : snapshots.getDocumentChanges()) {
                try {
                    String id = c.getDocument().getId();

                    if (c.getType() == DocumentChange.Type.REMOVED) {
                        orderRepo.deleteById(id);
                        continue;
                    }

                    Map<String, Object> d = c.getDocument().getData();
                    Order order = orderRepo.findById(id).orElse(new Order());
                    order.setId(id);
                    order.setOrderNumber((String) d.get("orderNumber"));
                    order.setStatus((String) d.get("status"));
                    order.setTotalAmount(d.get("totalAmount") != null
                            ? ((Number) d.get("totalAmount")).doubleValue()
                            : null);

                    applyTimestamp((Timestamp) d.get("createdAt"), order::setCreatedAt);
                    applyTimestamp((Timestamp) d.get("updatedAt"), order::setUpdatedAt);

                    orderRepo.saveAndFlush(order);
                    System.out.println("✅ Order synced: " + id);

                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        });
    }
}
