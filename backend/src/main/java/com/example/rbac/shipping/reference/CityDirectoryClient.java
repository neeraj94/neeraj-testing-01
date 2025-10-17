package com.example.rbac.shipping.reference;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CityDirectoryClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(CityDirectoryClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Map<String, List<String>> cache = new ConcurrentHashMap<>();

    public CityDirectoryClient(RestClient.Builder restClientBuilder,
                               ObjectMapper objectMapper,
                               @Value("${app.integrations.city-directory.base-url:https://countriesnow.space/api/v0.1}") String baseUrl) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.objectMapper = objectMapper;
    }

    public List<String> fetchCities(String countryName, String stateName) {
        if (!StringUtils.hasText(countryName) || !StringUtils.hasText(stateName)) {
            return List.of();
        }
        String cacheKey = buildCacheKey(countryName, stateName);
        List<String> cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        try {
            String responseBody = restClient.post()
                    .uri("/countries/state/cities")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "country", countryName.trim(),
                            "state", stateName.trim()
                    ))
                    .retrieve()
                    .body(String.class);

            if (isRedirectResponse(responseBody)) {
                responseBody = fetchViaQueryEndpoint(countryName, stateName);
            }

            if (!StringUtils.hasText(responseBody)) {
                return List.of();
            }

            CityDirectoryResponse response = objectMapper.readValue(responseBody, CityDirectoryResponse.class);
            if (response == null || response.isError() || CollectionUtils.isEmpty(response.getData())) {
                return List.of();
            }
            List<String> sanitized = response.getData().stream()
                    .filter(StringUtils::hasText)
                    .map(value -> value.trim())
                    .distinct()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .toList();
            cache.put(cacheKey, sanitized);
            return sanitized;
        } catch (Exception ex) {
            LOGGER.warn("Failed to fetch city list for {}, {}: {}", countryName, stateName, ex.getMessage());
            return List.of();
        }
    }

    private String buildCacheKey(String countryName, String stateName) {
        return countryName.trim().toLowerCase(Locale.ENGLISH) + "::" + stateName.trim().toLowerCase(Locale.ENGLISH);
    }

    private boolean isRedirectResponse(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            return false;
        }
        String normalized = responseBody.trim().toLowerCase(Locale.ENGLISH);
        return normalized.startsWith("moved permanently") && normalized.contains("redirecting to");
    }

    private String fetchViaQueryEndpoint(String countryName, String stateName) {
        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/countries/state/cities/q")
                            .queryParam("country", countryName.trim())
                            .queryParam("state", stateName.trim())
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (Exception redirectEx) {
            LOGGER.warn("Failed to follow city directory redirect for {}, {}: {}", countryName, stateName, redirectEx.getMessage());
            return null;
        }
    }

    private static final class CityDirectoryResponse {
        private boolean error;
        private List<String> data = Collections.emptyList();

        public boolean isError() {
            return error;
        }

        public void setError(boolean error) {
            this.error = error;
        }

        public List<String> getData() {
            return data;
        }

        public void setData(List<String> data) {
            this.data = data;
        }
    }
}
