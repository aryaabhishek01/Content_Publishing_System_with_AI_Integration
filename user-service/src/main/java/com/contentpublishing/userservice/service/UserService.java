package com.contentpublishing.userservice.service;

import com.contentpublishing.userservice.dto.*;
import com.contentpublishing.userservice.entity.OtpCode;
import com.contentpublishing.userservice.entity.User;
import com.contentpublishing.userservice.repository.UserRepository;
import com.contentpublishing.userservice.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final OtpService otpService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ────────────────────────────────────────────────────────────
    // REGISTRATION
    // ────────────────────────────────────────────────────────────

    @Transactional
    public String initiateRegistration(RegisterRequest request) {
        String normalizedEmail = request.getEmail().toLowerCase();
        String normalizedUsername = request.getUsername().toLowerCase();

        // If email exists but account is NOT yet verified, clean up and allow re-registration
        userRepository.findByEmail(normalizedEmail).ifPresent(existing -> {
            if (Boolean.TRUE.equals(existing.getIsActive()) || Boolean.TRUE.equals(existing.getIsEmailVerified())) {
                throw new IllegalArgumentException("Email already registered and verified: " + normalizedEmail);
            }
            // Unverified account — remove it so the user can try again
            logger.info("Removing unverified account for email {} to allow re-registration", normalizedEmail);
            userRepository.delete(existing);
            userRepository.flush();
        });

        // Check username uniqueness (excluding just-deleted record)
        userRepository.findByUsername(normalizedUsername).ifPresent(existing -> {
            if (!existing.getEmail().equals(normalizedEmail)) {
                throw new IllegalArgumentException("Username already taken: " + normalizedUsername);
            }
        });

        // Create user as inactive until OTP is verified
        User user = User.builder()
                .name(request.getName())
                .username(normalizedUsername)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .isActive(false)
                .isEmailVerified(false)
                .role(User.Role.USER)
                .build();

        userRepository.save(user);

        // Send OTP
        otpService.generateAndSendOtp(normalizedEmail, OtpCode.OtpType.REGISTRATION);
        logger.info("Registration initiated for email: {}", normalizedEmail);
        return "OTP sent to your email. Please verify to complete registration.";
    }

    @Transactional
    public String verifyRegistrationOtp(OtpVerifyRequest request) {
        String email = request.getEmail().toLowerCase();
        boolean valid = otpService.verifyOtp(email, request.getOtp(), OtpCode.OtpType.REGISTRATION);
        if (!valid) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setIsActive(true);
        user.setIsEmailVerified(true);
        userRepository.save(user);

        logger.info("Account activated for email: {}", email);
        return "Account verified and activated successfully.";
    }

    public String resendRegistrationOtp(String email) {
        String normalizedEmail = email.toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("No pending registration for: " + normalizedEmail));
        if (Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalArgumentException("Account already verified. Please log in.");
        }
        otpService.generateAndSendOtp(normalizedEmail, OtpCode.OtpType.REGISTRATION);
        logger.info("OTP resent for email: {}", normalizedEmail);
        return "A new OTP has been sent to your email.";
    }

    // ────────────────────────────────────────────────────────────
    // LOGIN
    // ────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getUsernameOrEmail().toLowerCase();

        // Find user by email or username
        User user = userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!user.getIsActive() || !user.getIsEmailVerified()) {
            throw new IllegalArgumentException("Account not verified. Please check your email for OTP.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        // Update last login
        user.setLastLoggedIn(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole().name());
        logger.info("User logged in: {}", user.getUsername());

        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .user(UserResponse.from(user))
                .message("Login successful")
                .build();
    }

    // ────────────────────────────────────────────────────────────
    // FORGOT PASSWORD
    // ────────────────────────────────────────────────────────────

    public String forgotPassword(String email) {
        String normalizedEmail = email.toLowerCase();
        userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found with email: " + normalizedEmail));
        otpService.generateAndSendOtp(normalizedEmail, OtpCode.OtpType.PASSWORD_RESET);
        return "OTP sent to your email for password reset.";
    }

    @Transactional
    public String resetPassword(ResetPasswordRequest request) {
        String email = request.getEmail().toLowerCase();
        boolean valid = otpService.verifyOtp(email, request.getOtp(), OtpCode.OtpType.PASSWORD_RESET);
        if (!valid) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        logger.info("Password reset for email: {}", email);
        return "Password reset successfully.";
    }

    // ────────────────────────────────────────────────────────────
    // PROFILE
    // ────────────────────────────────────────────────────────────

    public UserResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserResponse.from(user);
    }

    public UserResponse getProfileByUsername(String username) {
        User user = userRepository.findByUsername(username.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(Long userId, String name, String bio) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (name != null && !name.isBlank()) {
            // Validate name — alphabets and spaces only
            if (!name.matches("^[A-Za-z][A-Za-z ]*$")) {
                throw new IllegalArgumentException("Name must contain only alphabets and spaces");
            }
            user.setName(name);
        }
        if (bio != null) {
            user.setBio(bio);
        }

        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse uploadProfilePicture(Long userId, MultipartFile file) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Save uploaded file
        String uploadDir = "uploads/profile-pictures/";
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        user.setProfilePicture("/uploads/profile-pictures/" + fileName);
        userRepository.save(user);
        return UserResponse.from(user);
    }

    // ────────────────────────────────────────────────────────────
    // SEARCH
    // ────────────────────────────────────────────────────────────

    public List<UserResponse> searchUsers(String keyword) {
        return userRepository.searchUsers(keyword)
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────
    // ADMIN
    // ────────────────────────────────────────────────────────────

    public List<UserResponse> getAllUsers() {
        return userRepository.findAllOrderByLastLogin()
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    public List<UserResponse> getUsersByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        return userRepository.findAllById(ids)
                .stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }
}
