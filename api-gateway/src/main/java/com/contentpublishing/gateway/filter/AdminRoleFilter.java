package com.contentpublishing.gateway.filter;

import com.contentpublishing.gateway.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class AdminRoleFilter extends AbstractGatewayFilterFactory<AdminRoleFilter.Config> {

    private static final Logger logger = LoggerFactory.getLogger(AdminRoleFilter.class);

    @Autowired
    private JwtUtil jwtUtil;

    public AdminRoleFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String role = exchange.getRequest().getHeaders().getFirst("X-User-Role");
            if (!"ADMIN".equals(role)) {
                logger.warn("Access denied to admin route for non-admin role: {}", role);
                exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
                return exchange.getResponse().setComplete();
            }
            return chain.filter(exchange);
        };
    }

    public static class Config {}
}
