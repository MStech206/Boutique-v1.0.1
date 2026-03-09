package com.super_admin_backend.Enums;

public enum StaffRole {

    DYEING(5),
    CUTTING(2),
    STITCHING(1),
    PAINTING(1),
    KHAKA(1),
    MAGGAM(1),
    QUALITY_CHECK(10),
    READY_TO_DELIVER(20);

    private final int maxActiveTasks;

    StaffRole(int maxActiveTasks) {
        this.maxActiveTasks = maxActiveTasks;
    }

    public int getMaxActiveTasks() {
        return maxActiveTasks;
    }
}
