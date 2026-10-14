package com.contentpublishing.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.Instant;

@Component
public class LoggingFilter extends AbstractGatewayFilterFactory<LoggingFilter.Config> {

    private static final Logger logger = LoggerFactory.getLogger(LoggingFilter.class);

    public LoggingFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            long startTime = System.currentTimeMillis();
            String method = exchange.getRequest().getMethod().name();
            String path = exchange.getRequest().getPath().toString();
            String userId = exchange.getRequest().getHeaders().getFirst("X-User-Id");

            logger.info("→ Incoming Request | method={} path={} userId={} time={}",
                    method, path, userId, Instant.now());

            return chain.filter(exchange).then(Mono.fromRunnable(() -> {
                long duration = System.currentTimeMillis() - startTime;
                int statusCode = exchange.getResponse().getStatusCode() != null
                        ? exchange.getResponse().getStatusCode().value() : 0;
                logger.info("← Outgoing Response | method={} path={} status={} duration={}ms",
                        method, path, statusCode, duration);
            }));
        };
    }

    public static class Config {}
}
