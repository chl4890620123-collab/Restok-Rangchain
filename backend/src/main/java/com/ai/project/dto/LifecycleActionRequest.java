package com.ai.project.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LifecycleActionRequest {

    @NotBlank
    private String action;

    @Min(1)
    private int quantity = 1;

    private String serviceName;
    private String targetUrl;
    private String note;
}
