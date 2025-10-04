package com.example.rbac.invoices.repository;

import com.example.rbac.invoices.model.Invoice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @EntityGraph(attributePaths = {"items", "customer"})
    Optional<Invoice> findDetailedById(Long id);
}
