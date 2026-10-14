package com.contentpublishing.userservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    /**
     * Name: only alphabets and spaces, no numbers
     */
    @NotBlank(message = "Name is required")
    @Pattern(
        regexp = "^[A-Za-z][A-Za-z ]*$",
        message = "Name must contain only alphabets and spaces, no numbers"
    )
    private String name;

    /**
     * Username: at least 4 alphabets followed by anything except space
     */
    @NotBlank(message = "Username is required")
    @Pattern(
        regexp = "^[A-Za-z]{4,}[^\\s]*$",
        message = "Username must start with at least 4 alphabets and contain no spaces"
    )
    private String username;

    /**
     * Email: min 3 chars before @gmail.com
     */
    @NotBlank(message = "Email is required")
    @Pattern(
        regexp = "^[A-Za-z0-9._%+\\-]{3,}@gmail\\.com$",
        message = "Email must have at least 3 characters before @gmail.com"
    )
    private String email;

    /**
     * Password: minimum 8 characters
     */
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;
}
