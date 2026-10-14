package com.contentpublishing.postservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path rootUploads = Paths.get("uploads").toAbsolutePath().normalize();
        Path moduleUploads = Paths.get("post-service", "uploads").toAbsolutePath().normalize();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(
                        rootUploads.toUri().toString() + "/",
                        moduleUploads.toUri().toString() + "/",
                        "file:uploads/",
                        "file:post-service/uploads/"
                );
    }
}
