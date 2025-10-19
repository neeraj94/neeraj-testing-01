package com.example.rbac.checkout.service;

import com.example.rbac.cart.model.Cart;
import com.example.rbac.cart.model.CartItem;
import com.example.rbac.cart.repository.CartRepository;
import com.example.rbac.checkout.dto.AppliedCouponDto;
import com.example.rbac.checkout.dto.CheckoutAddressDto;
import com.example.rbac.checkout.dto.CheckoutAddressRequest;
import com.example.rbac.checkout.dto.CheckoutOrderLineRequest;
import com.example.rbac.checkout.dto.CheckoutOrderRequest;
import com.example.rbac.checkout.dto.CheckoutOrderResponse;
import com.example.rbac.checkout.dto.CheckoutSummaryDto;
import com.example.rbac.checkout.dto.OrderDetailDto;
import com.example.rbac.checkout.dto.OrderListItemDto;
import com.example.rbac.checkout.dto.OrderSummaryDto;
import com.example.rbac.checkout.dto.OrderTaxLineDto;
import com.example.rbac.checkout.dto.PaymentMethodDto;
import com.example.rbac.checkout.dto.PaymentMethodSettingsRequest;
import com.example.rbac.common.exception.ApiException;
import com.example.rbac.finance.taxrate.model.TaxRate;
import com.example.rbac.finance.taxrate.model.TaxRateType;
import com.example.rbac.shipping.dto.ShippingOptionDto;
import com.example.rbac.shipping.dto.ShippingRateQuoteDto;
import com.example.rbac.shipping.service.ShippingLocationService;
import com.example.rbac.users.model.User;
import com.example.rbac.users.model.UserPrincipal;
import com.example.rbac.users.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.stream.Collectors;

@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final CheckoutAddressService addressService;
    private final PaymentMethodService paymentMethodService;
    private final ShippingLocationService shippingLocationService;
    private final CheckoutCouponService checkoutCouponService;
    private final OrderService orderService;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;

    public CheckoutService(CheckoutAddressService addressService,
                           PaymentMethodService paymentMethodService,
                           ShippingLocationService shippingLocationService,
                           CheckoutCouponService checkoutCouponService,
                           OrderService orderService,
                           UserRepository userRepository,
                           CartRepository cartRepository) {
        this.addressService = addressService;
        this.paymentMethodService = paymentMethodService;
        this.shippingLocationService = shippingLocationService;
        this.checkoutCouponService = checkoutCouponService;
        this.orderService = orderService;
        this.userRepository = userRepository;
        this.cartRepository = cartRepository;
    }

    @Transactional(readOnly = true)
    public List<CheckoutAddressDto> listAddresses(Long userId) {
        return addressService.listAddresses(userId);
    }

    @Transactional
    public CheckoutAddressDto createAddress(Long userId, CheckoutAddressRequest request) {
        return addressService.createAddress(userId, request);
    }

    @Transactional
    public CheckoutAddressDto updateAddress(Long userId, Long addressId, CheckoutAddressRequest request) {
        return addressService.updateAddress(userId, addressId, request);
    }

    @Transactional
    public CheckoutAddressDto updateAddressAsAdmin(Long userId, Long addressId, CheckoutAddressRequest request) {
        return addressService.updateAddressAsAdmin(userId, addressId, request);
    }

    @Transactional
    public void deleteAddressAsAdmin(Long userId, Long addressId) {
        addressService.deleteAddressAsAdmin(userId, addressId);
    }

    @Transactional(readOnly = true)
    public CheckoutSummaryDto buildSummary(Long userId, CheckoutOrderRequest request) {
        CheckoutSummaryDto summary = new CheckoutSummaryDto();
        summary.setAddresses(addressService.listAddresses(userId));
        summary.setPaymentMethods(paymentMethodService.listForCustomer());
        summary.setCoupons(checkoutCouponService.listActiveCoupons(userId));
        OrderSummaryDto orderSummary;
        try {
            orderSummary = calculateOrderTotals(userId, request);
        } catch (RuntimeException ex) {
            log.warn("Unable to calculate checkout summary for user {}", userId, ex);
            orderSummary = emptySummary();
        }
        summary.setOrderSummary(orderSummary);
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

        List<CheckoutOrderLineRequest> orderLines = resolveOrderLines(userId, request);
        request.setLines(orderLines);
        PaymentMethodDto paymentMethod = paymentMethodService.getMethodOrThrow(request.getPaymentMethodKey());
        OrderSummaryDto orderSummary = calculateOrderTotals(userId, request);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (orderSummary.getProductTotal() == null || orderSummary.getProductTotal().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Add items to your cart before placing an order");
        }
        CheckoutOrderResponse response = orderService.createOrder(
                userId,
                user.getEmail(),
                user.getFullName(),
                shippingAddress,
                billingAddress,
                paymentMethod,
                orderSummary,
                orderLines);
        clearCart(userId);
        return response;
    }

    @Transactional(readOnly = true)
    public List<PaymentMethodDto> listPaymentMethodsForCustomer() {
        return paymentMethodService.listForCustomer();
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> listEnabledCountries() {
        return shippingLocationService.enabledCountryOptions();
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> listEnabledStates(Long countryId) {
        return shippingLocationService.enabledStateOptions(countryId);
    }

    @Transactional(readOnly = true)
    public List<ShippingOptionDto> listEnabledCities(Long stateId) {
        return shippingLocationService.enabledCityOptions(stateId);
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
    public List<OrderListItemDto> listOrdersForUser(Long userId) {
        return orderService.listOrdersForUser(userId);
    }

    @Transactional(readOnly = true)
    public OrderDetailDto getOrderDetail(Long orderId) {
        return orderService.getOrder(orderId);
    }

    @Transactional(readOnly = true)
    public OrderDetailDto getOrderDetailForUser(Long userId, Long orderId) {
        return orderService.getOrderForUser(userId, orderId);
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
        CheckoutAddressDto shippingAddress = null;
        if (request != null && request.getShippingAddressId() != null) {
            try {
                shippingAddress = addressService.getAddress(userId, request.getShippingAddressId());
            } catch (ApiException ignored) {
                shippingAddress = null;
            }
        }

        ShippingRateQuoteDto quote = null;
        if (shippingAddress != null) {
            try {
                quote = shippingLocationService.resolveShippingRate(
                        shippingAddress.getCountryId(),
                        shippingAddress.getStateId(),
                        shippingAddress.getCityId());
            } catch (ApiException ex) {
                quote = null;
            }
        }

        List<OrderTaxLineDto> taxLines = new ArrayList<>();
        BigDecimal productTotal = ZERO;
        BigDecimal taxTotal = ZERO;

        List<CheckoutOrderLineRequest> lines = resolveOrderLines(userId, request);
        if (!CollectionUtils.isEmpty(lines)) {
            for (CheckoutOrderLineRequest line : lines) {
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

        AppliedCouponDto appliedCoupon = checkoutCouponService.applyCoupon(
                request != null ? request.getCouponCode() : null,
                userId,
                productTotal);
        BigDecimal discountTotal = appliedCoupon != null
                ? Optional.ofNullable(appliedCoupon.getDiscountAmount()).orElse(ZERO)
                : ZERO;
        if (discountTotal.compareTo(BigDecimal.ZERO) < 0) {
            discountTotal = BigDecimal.ZERO;
        }

        OrderSummaryDto summary = new OrderSummaryDto();
        summary.setProductTotal(productTotal.setScale(2, RoundingMode.HALF_UP));
        summary.setTaxTotal(taxTotal.setScale(2, RoundingMode.HALF_UP));
        summary.setShippingTotal(shippingTotal);
        summary.setDiscountTotal(discountTotal.setScale(2, RoundingMode.HALF_UP));
        BigDecimal grandTotal = productTotal.add(taxTotal).add(shippingTotal).subtract(discountTotal);
        if (grandTotal.compareTo(BigDecimal.ZERO) < 0) {
            grandTotal = BigDecimal.ZERO;
        }
        summary.setGrandTotal(grandTotal.setScale(2, RoundingMode.HALF_UP));
        summary.setShippingBreakdown(quote);
        summary.setTaxLines(taxLines);
        summary.setAppliedCoupon(appliedCoupon);
        return summary;
    }

    private OrderSummaryDto emptySummary() {
        OrderSummaryDto summary = new OrderSummaryDto();
        summary.setProductTotal(ZERO);
        summary.setTaxTotal(ZERO);
        summary.setShippingTotal(ZERO);
        summary.setGrandTotal(ZERO);
        summary.setDiscountTotal(ZERO);
        summary.setTaxLines(List.of());
        summary.setShippingBreakdown(null);
        summary.setAppliedCoupon(null);
        return summary;
    }

    private List<CheckoutOrderLineRequest> resolveOrderLines(Long userId, CheckoutOrderRequest request) {
        if (request != null && !CollectionUtils.isEmpty(request.getLines())) {
            return request.getLines();
        }
        return cartRepository.findByUserId(userId)
                .map(Cart::getItems)
                .map(items -> items.stream()
                        .map(this::toOrderLine)
                        .collect(Collectors.toList()))
                .orElseGet(List::of);
    }

    private CheckoutOrderLineRequest toOrderLine(CartItem item) {
        CheckoutOrderLineRequest line = new CheckoutOrderLineRequest();
        line.setProductId(item.getProduct() != null ? item.getProduct().getId() : null);
        line.setName(item.getProduct() != null ? item.getProduct().getName() : null);
        line.setProductSlug(item.getProduct() != null ? item.getProduct().getSlug() : null);
        line.setQuantity(Optional.ofNullable(item.getQuantity()).orElse(0));
        line.setUnitPrice(Optional.ofNullable(item.getUnitPrice()).orElse(BigDecimal.ZERO));
        if (item.getVariant() != null) {
            line.setVariantId(item.getVariant().getId());
            line.setVariantSku(item.getVariant().getSku());
        }
        line.setVariantLabel(item.getVariantLabel());
        BigDecimal effectiveTaxRate = calculateEffectiveTaxRate(item);
        if (effectiveTaxRate != null && effectiveTaxRate.compareTo(BigDecimal.ZERO) > 0) {
            line.setTaxRate(effectiveTaxRate);
        }
        return line;
    }

    private BigDecimal calculateEffectiveTaxRate(CartItem item) {
        if (item.getProduct() == null || CollectionUtils.isEmpty(item.getProduct().getTaxRates())) {
            return null;
        }
        BigDecimal unitPrice = Optional.ofNullable(item.getUnitPrice()).orElse(BigDecimal.ZERO);
        BigDecimal totalRate = BigDecimal.ZERO;
        for (TaxRate taxRate : item.getProduct().getTaxRates()) {
            if (taxRate == null || taxRate.getRateValue() == null) {
                continue;
            }
            if (taxRate.getRateType() == TaxRateType.PERCENTAGE) {
                totalRate = totalRate.add(taxRate.getRateValue()
                        .divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
            } else if (taxRate.getRateType() == TaxRateType.FLAT && unitPrice.compareTo(BigDecimal.ZERO) > 0) {
                totalRate = totalRate.add(taxRate.getRateValue()
                        .divide(unitPrice, 6, RoundingMode.HALF_UP));
            }
        }
        if (totalRate.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return totalRate;
    }

    private void clearCart(Long userId) {
        cartRepository.findByUserId(userId).ifPresent(cart -> {
            if (!CollectionUtils.isEmpty(cart.getItems())) {
                cart.getItems().clear();
                cartRepository.saveAndFlush(cart);
            }
        });
    }
}
