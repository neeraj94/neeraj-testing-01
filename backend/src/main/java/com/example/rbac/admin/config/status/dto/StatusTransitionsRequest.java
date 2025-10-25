package com.example.rbac.admin.config.status.dto;

import java.util.List;

public class StatusTransitionsRequest {

    private List<Long> toStatusIds;

    public List<Long> getToStatusIds() {
        return toStatusIds;
    }

    public void setToStatusIds(List<Long> toStatusIds) {
        this.toStatusIds = toStatusIds;
    }
}
