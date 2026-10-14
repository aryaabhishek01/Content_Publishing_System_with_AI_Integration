package com.contentpublishing.gateway.filter;

import com.contentpublishing.gateway.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class JwtAuthFilterTest {

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private JwtAuthFilter jwtAuthFilter;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testMissingAuthHeader_returns401() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/users/profile").build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());

        JwtAuthFilter.Config config = new JwtAuthFilter.Config();
        GatewayFilter filter = jwtAuthFilter.apply(config);

        filter.filter(exchange, chain).block();

        assert exchange.getResponse().getStatusCode() == HttpStatus.UNAUTHORIZED;
        verify(chain, never()).filter(any());
    }

    @Test
    void testInvalidToken_returns401() {
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/users/profile")
                .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.token.here")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        when(jwtUtil.validateToken("invalid.token.here")).thenReturn(false);

        JwtAuthFilter.Config config = new JwtAuthFilter.Config();
        GatewayFilter filter = jwtAuthFilter.apply(config);

        filter.filter(exchange, chain).block();

        assert exchange.getResponse().getStatusCode() == HttpStatus.UNAUTHORIZED;
    }

    @Test
    void testValidToken_forwardsRequest() {
        String validToken = "valid.jwt.token";
        MockServerHttpRequest request = MockServerHttpRequest
                .get("/api/users/profile")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + validToken)
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        GatewayFilterChain chain = mock(GatewayFilterChain.class);
        when(chain.filter(any())).thenReturn(Mono.empty());
        when(jwtUtil.validateToken(validToken)).thenReturn(true);
        when(jwtUtil.extractUsername(validToken)).thenReturn("testuser");
        when(jwtUtil.extractRole(validToken)).thenReturn("USER");
        when(jwtUtil.extractUserId(validToken)).thenReturn(1L);

        JwtAuthFilter.Config config = new JwtAuthFilter.Config();
        GatewayFilter filter = jwtAuthFilter.apply(config);

        filter.filter(exchange, chain).block();

        verify(chain, times(1)).filter(any());
    }
}
