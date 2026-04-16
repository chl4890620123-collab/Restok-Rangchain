package com.ai.project.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String path = uploadDir;
        if (!path.endsWith("/") && !path.endsWith("\\")) {
            path += File.separator;
        }

        String location = "file:" + new File(path).getAbsolutePath() + File.separator;

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);

        System.out.println("✅ [System] Photo Mapping Path: " + location);
    }
}