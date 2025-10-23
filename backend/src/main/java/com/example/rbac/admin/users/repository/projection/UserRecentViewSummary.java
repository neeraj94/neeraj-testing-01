package com.example.rbac.admin.users.repository.projection;

import java.time.Instant;

public interface UserRecentViewSummary {

    Long getId();

    Long getProductId();

    Instant getViewedAt();
}
