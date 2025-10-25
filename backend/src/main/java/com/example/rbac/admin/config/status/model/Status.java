package com.example.rbac.admin.config.status.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "statuses",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_statuses_type_code", columnNames = {"status_type_id", "code"}),
                @UniqueConstraint(name = "uk_statuses_type_name", columnNames = {"status_type_id", "name"})
        })
public class Status {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "status_type_id", nullable = false)
    private StatusType statusType;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 80)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String icon;

    @Column(name = "color_hex", length = 7)
    private String colorHex;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_default", nullable = false)
    private boolean defaultStatus;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "visible_to_customer")
    private Boolean visibleToCustomer;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 1000;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public StatusType getStatusType() {
        return statusType;
    }

    public void setStatusType(StatusType statusType) {
        this.statusType = statusType;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getColorHex() {
        return colorHex;
    }

    public void setColorHex(String colorHex) {
        this.colorHex = colorHex;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isDefaultStatus() {
        return defaultStatus;
    }

    public void setDefaultStatus(boolean defaultStatus) {
        this.defaultStatus = defaultStatus;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Boolean getVisibleToCustomer() {
        return visibleToCustomer;
    }

    public void setVisibleToCustomer(Boolean visibleToCustomer) {
        this.visibleToCustomer = visibleToCustomer;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
