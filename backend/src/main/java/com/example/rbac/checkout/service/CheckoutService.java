package com.example.rbac.checkout.service;

import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.checkout.dto.CheckoutOrderRequest;
import com.example.rbac.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.checkout.dto.CheckoutSummaryDto;
import com.example.rbac.checkout.dto.OrderListItemDto;
import com.example.rbac.checkout.dto.OrderSummaryDto;
import com.example.rbac.checkout.dto.OrderTaxLineDto;
import com.example.rbac.checkout.dto.PaymentMethodDto;
import com.example.rbac.checkout.dto.PaymentMethodSettingsRequest;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.shipping.dto.ShippingRateQuoteDto;
import com.example.rbac.shipping.service.ShippingLocationService;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class CheckoutService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final CheckoutAddressService addressService;
    private final PaymentMethodService paymentMethodService;
    private final ShippingLocationService shippingLocationService;
    private final OrderService orderService;
    private final UserRepository userRepository;

    public CheckoutService(CheckoutAddressService addressService,
                           PaymentMethodService paymentMethodService,
                           ShippingLocationService shippingLocationService,
                           OrderService orderService,
                           UserRepository userRepository) {
        this.addressService = addressService;
        this.paymentMethodService = paymentMethodService;
        this.shippingLocationService = shippingLocationService;
        this.orderService = orderService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<CheckoutAddressDto> listAddresses(Long userId) {
        return addressService.listAddresses(userId);
    }

    @Transactional
    public CheckoutAddressDto createAddress(Long userId, CheckoutAddressRequest request) {
        return addressService.createAddress(userId, request);
    }

    @Transactional(readOnly = true)
    public CheckoutSummaryDto buildSummary(Long userId, CheckoutOrderRequest request) {
        CheckoutSummaryDto summary = new CheckoutSummaryDto();
        summary.setAddresses(addressService.listAddresses(userId));
        summary.setPaymentMethods(paymentMethodService.listForCustomer());
        summary.setOrderSummary(calculateOrderTotals(userId, request));
        return summary;
    }

    @Transactional
    public CheckoutOrderResponse placeOrder(Long userId, CheckoutOrderRequest request) {
        if (request == null || request.getShippingAddressId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Shipping address is required");
        }
        CheckoutAddressDto shippingAddress = addressService.getAddress(userId, request.getShippingAddressId());
        CheckoutAddressDto billingAddress;
        if (request.isSameAsShipping()) {
            billingAddress = shippingAddress;
        } else {
            if (request.getBillingAddressId() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Billing address is required");
            }
            billingAddress = addressService.getAddress(userId, request.getBillingAddressId());
        }

        PaymentMethodDto paymentMethod = paymentMethodService.getMethodOrThrow(request.getPaymentMethodKey());
        OrderSummaryDto orderSummary = calculateOrderTotals(userId, request);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return orderService.createOrder(userId, user.getFullName(), shippingAddress, billingAddress, paymentMethod, orderSummary);
    }

    @Transactional(readOnly = true)
    public List<PaymentMethodDto> listPaymentMethodsForCustomer() {
        return paymentMethodService.listForCustomer();
    }

    @Transactional(readOnly = true)
    public List<PaymentMethodDto> listPaymentMethodsForAdmin() {
        return paymentMethodService.listForAdmin();
    }

    @Transactional
    public PaymentMethodDto updatePaymentMethod(String key, PaymentMethodSettingsRequest request) {
        return paymentMethodService.updateSettings(key, request);
    }

    @Transactional(readOnly = true)
    public List<OrderListItemDto> listOrders() {
        return orderService.listOrders();
    }

    @Transactional(readOnly = true)
    public List<CheckoutAddressDto> listAddressesForAdmin(Long userId) {
        return addressService.listAddressesForAdmin(userId);
    }

    public Long resolveCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return Optional.ofNullable(userPrincipal.getUser())
                    .map(User::getId)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User session expired"));
        }
        if (principal instanceof User user) {
            return user.getId();
        }
        throw new ApiException(HttpStatus.UNAUTHORIZED, "User session expired");
    }

    private OrderSummaryDto calculateOrderTotals(Long userId, CheckoutOrderRequest request) {
        if (request == null) {
            return emptySummary();
        }
        CheckoutAddressDto shippingAddress = null;
        if (request.getShippingAddressId() != null) {
            try {
                shippingAddress = addressService.getAddress(userId, request.getShippingAddressId());
            } catch (ApiException ignored) {
                shippingAddress = null;
            }
        }

        ShippingRateQuoteDto quote = null;
        if (shippingAddress != null) {
            quote = shippingLocationService.resolveShippingRate(
                    shippingAddress.getCountryId(),
                    shippingAddress.getStateId(),
                    shippingAddress.getCityId());
        }

        List<OrderTaxLineDto> taxLines = new ArrayList<>();
        BigDecimal productTotal = ZERO;
        BigDecimal taxTotal = ZERO;

        if (!CollectionUtils.isEmpty(request.getLines())) {
            for (var line : request.getLines()) {
                if (line == null) {
                    continue;
                }
                int quantity = Optional.ofNullable(line.getQuantity()).orElse(1);
                if (quantity <= 0) {
                    continue;
                }
                BigDecimal qty = BigDecimal.valueOf(quantity);
                BigDecimal unitPrice = Optional.ofNullable(line.getUnitPrice()).orElse(BigDecimal.ZERO);
                BigDecimal lineTotal = unitPrice.multiply(qty).setScale(2, RoundingMode.HALF_UP);
                productTotal = productTotal.add(lineTotal);
                BigDecimal rate = Optional.ofNullable(line.getTaxRate()).orElse(BigDecimal.ZERO);
                BigDecimal taxAmount = lineTotal.multiply(rate).setScale(2, RoundingMode.HALF_UP);
                if (taxAmount.compareTo(BigDecimal.ZERO) > 0) {
                    OrderTaxLineDto taxLine = new OrderTaxLineDto();
                    taxLine.setProductId(line.getProductId());
                    taxLine.setProductName(line.getName());
                    taxLine.setTaxableAmount(lineTotal);
                    taxLine.setTaxRate(rate);
                    taxLine.setTaxAmount(taxAmount);
                    taxLines.add(taxLine);
                }
                taxTotal = taxTotal.add(taxAmount);
            }
        }

        BigDecimal shippingTotal = quote != null && quote.getEffectiveCost() != null
                ? quote.getEffectiveCost().setScale(2, RoundingMode.HALF_UP)
                : ZERO;

        OrderSummaryDto summary = new OrderSummaryDto();
        summary.setProductTotal(productTotal.setScale(2, RoundingMode.HALF_UP));
        summary.setTaxTotal(taxTotal.setScale(2, RoundingMode.HALF_UP));
        summary.setShippingTotal(shippingTotal);
        summary.setGrandTotal(productTotal.add(taxTotal).add(shippingTotal).setScale(2, RoundingMode.HALF_UP));
        summary.setShippingBreakdown(quote);
        summary.setTaxLines(taxLines);
        return summary;
    }

    private OrderSummaryDto emptySummary() {
        OrderSummaryDto summary = new OrderSummaryDto();
        summary.setProductTotal(ZERO);
        summary.setTaxTotal(ZERO);
        summary.setShippingTotal(ZERO);
        summary.setGrandTotal(ZERO);
        summary.setTaxLines(List.of());
        return summary;
    }
}
