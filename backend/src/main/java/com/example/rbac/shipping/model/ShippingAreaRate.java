package com.example.rbac.shipping.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "shipping_area_rates")
public class ShippingAreaRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id", nullable = false)
    private ShippingCountry country;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "state_id", nullable = false)
    private ShippingState state;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", nullable = false)
    private ShippingCity city;

    @Column(name = "cost_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal costValue;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ShippingCountry getCountry() {
        return country;
    }

    public void setCountry(ShippingCountry country) {
        this.country = country;
    }

    public ShippingState getState() {
        return state;
    }

    public void setState(ShippingState state) {
        this.state = state;
    }

    public ShippingCity getCity() {
        return city;
    }

    public void setCity(ShippingCity city) {
        this.city = city;
    }

    public BigDecimal getCostValue() {
        return costValue;
    }

    public void setCostValue(BigDecimal costValue) {
        this.costValue = costValue;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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
