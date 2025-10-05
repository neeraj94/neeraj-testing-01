package com.example.rbac.users.dto;

public class UserSummaryResponse {
    private long totalUsers;
    private long activeUsers;
    private long inactiveUsers;
    private long customerUsers;
    private long internalUsers;

    public UserSummaryResponse(long totalUsers,
                               long activeUsers,
                               long inactiveUsers,
                               long customerUsers,
                               long internalUsers) {
        this.totalUsers = totalUsers;
        this.activeUsers = activeUsers;
        this.inactiveUsers = inactiveUsers;
        this.customerUsers = customerUsers;
        this.internalUsers = internalUsers;
    }

    public long getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(long totalUsers) {
        this.totalUsers = totalUsers;
    }

    public long getActiveUsers() {
        return activeUsers;
    }

    public void setActiveUsers(long activeUsers) {
        this.activeUsers = activeUsers;
    }

    public long getInactiveUsers() {
        return inactiveUsers;
    }

    public void setInactiveUsers(long inactiveUsers) {
        this.inactiveUsers = inactiveUsers;
    }

    public long getCustomerUsers() {
        return customerUsers;
    }

    public void setCustomerUsers(long customerUsers) {
        this.customerUsers = customerUsers;
    }

    public long getInternalUsers() {
        return internalUsers;
    }

    public void setInternalUsers(long internalUsers) {
        this.internalUsers = internalUsers;
    }
}
