package com.resumeanalyzer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public static class RegisterRequest {
        @NotBlank
        public String name;

        @NotBlank @Email
        public String email;

        @NotBlank @Size(min = 6, message = "Password must be at least 6 characters")
        public String password;

        public String targetJobRole;
    }

    public static class LoginRequest {
        @NotBlank @Email
        public String email;

        @NotBlank
        public String password;
    }

    public static class AuthResponse {
        public String token;
        public Long userId;
        public String name;
        public String email;

        public AuthResponse(String token, Long userId, String name, String email) {
            this.token = token;
            this.userId = userId;
            this.name = name;
            this.email = email;
        }
    }
}
