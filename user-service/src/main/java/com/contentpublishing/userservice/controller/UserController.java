package com.contentpublishing.userservice.controller;

import com.contentpublishing.userservice.dto.*;
import com.contentpublishing.userservice.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ────────────────────────────────────────────────────────────
    // AUTH ENDPOINTS (public — no JWT required)
    // ────────────────────────────────────────────────────────────

    @PostMapping("/api/auth/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        String message = userService.initiateRegistration(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/api/auth/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        String message = userService.verifyRegistrationOtp(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/api/auth/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String message = userService.resendRegistrationOtp(email);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/auth/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String message = userService.forgotPassword(email);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/api/auth/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        String message = userService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    // ────────────────────────────────────────────────────────────
    // USER ENDPOINTS (protected — JWT required, sent by gateway as headers)
    // ────────────────────────────────────────────────────────────

    @GetMapping("/api/users/me")
    public ResponseEntity<UserResponse> getMyProfile(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/api/users/me")
    public ResponseEntity<UserResponse> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(userService.updateProfile(userId, body.get("name"), body.get("bio")));
    }

    @PostMapping("/api/users/me/profile-picture")
    public ResponseEntity<UserResponse> uploadProfilePicture(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(userService.uploadProfilePicture(userId, file));
    }

    @GetMapping("/api/users/{username}")
    public ResponseEntity<UserResponse> getUserByUsername(@PathVariable String username) {
        return ResponseEntity.ok(userService.getProfileByUsername(username));
    }

    @GetMapping("/api/users/search")
    public ResponseEntity<List<UserResponse>> searchUsers(@RequestParam String keyword) {
        return ResponseEntity.ok(userService.searchUsers(keyword));
    }

    @GetMapping("/api/users/all")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PostMapping("/api/users/batch")
    public ResponseEntity<List<UserResponse>> getUsersByIds(@RequestBody List<Long> ids) {
        return ResponseEntity.ok(userService.getUsersByIds(ids));
    }

    @GetMapping("/api/users/id/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getProfile(id));
    }
}
