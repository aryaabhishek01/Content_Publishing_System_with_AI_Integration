package com.contentpublishing.userservice.service;

import com.contentpublishing.userservice.dto.*;
import com.contentpublishing.userservice.entity.User;
import com.contentpublishing.userservice.repository.UserRepository;
import com.contentpublishing.userservice.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private OtpService otpService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;

    @InjectMocks private UserService userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    // ────────── REGISTRATION TESTS ──────────

    @Test
    void testInitiateRegistration_success() {
        RegisterRequest req = new RegisterRequest();
        req.setName("John Doe");
        req.setUsername("johndoe");
        req.setEmail("john@gmail.com");
        req.setPassword("password123");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedpw");
        when(userRepository.save(any())).thenReturn(new User());
        doNothing().when(otpService).generateAndSendOtp(anyString(), any());

        String result = userService.initiateRegistration(req);
        assertTrue(result.contains("OTP"));
        verify(otpService, times(1)).generateAndSendOtp(anyString(), any());
    }

    @Test
    void testInitiateRegistration_emailAlreadyExists_throwsException() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("existing@gmail.com");
        req.setUsername("newuser");

        when(userRepository.existsByEmail("existing@gmail.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.initiateRegistration(req));
    }

    @Test
    void testInitiateRegistration_usernameAlreadyExists_throwsException() {
        RegisterRequest req = new RegisterRequest();
        req.setEmail("new@gmail.com");
        req.setUsername("takenuser");

        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.existsByUsername("takenuser")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.initiateRegistration(req));
    }

    // ────────── OTP VERIFICATION TESTS ──────────

    @Test
    void testVerifyRegistrationOtp_success() {
        OtpVerifyRequest req = new OtpVerifyRequest();
        req.setEmail("john@gmail.com");
        req.setOtp("123456");

        User user = User.builder()
                .email("john@gmail.com")
                .isActive(false)
                .isEmailVerified(false)
                .build();

        when(otpService.verifyOtp(anyString(), anyString(), any())).thenReturn(true);
        when(userRepository.findByEmail("john@gmail.com")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);

        String result = userService.verifyRegistrationOtp(req);
        assertTrue(result.contains("verified"));
        assertTrue(user.getIsActive());
    }

    @Test
    void testVerifyRegistrationOtp_invalidOtp_throwsException() {
        OtpVerifyRequest req = new OtpVerifyRequest();
        req.setEmail("john@gmail.com");
        req.setOtp("999999");

        when(otpService.verifyOtp(anyString(), anyString(), any())).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> userService.verifyRegistrationOtp(req));
    }

    // ────────── LOGIN TESTS ──────────

    @Test
    void testLogin_success_withEmail() {
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("john@gmail.com");
        req.setPassword("password123");

        User user = User.builder()
                .id(1L)
                .username("johndoe")
                .email("john@gmail.com")
                .password("hashedpw")
                .isActive(true)
                .isEmailVerified(true)
                .role(User.Role.USER)
                .build();

        when(userRepository.findByEmail("john@gmail.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashedpw")).thenReturn(true);
        when(jwtUtil.generateToken(anyLong(), anyString(), anyString())).thenReturn("jwt.token.here");
        when(userRepository.save(any())).thenReturn(user);

        AuthResponse response = userService.login(req);
        assertNotNull(response.getToken());
        assertEquals("jwt.token.here", response.getToken());
    }

    @Test
    void testLogin_invalidPassword_throwsException() {
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("john@gmail.com");
        req.setPassword("wrongpassword");

        User user = User.builder()
                .email("john@gmail.com")
                .password("hashedpw")
                .isActive(true)
                .isEmailVerified(true)
                .build();

        when(userRepository.findByEmail("john@gmail.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpassword", "hashedpw")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> userService.login(req));
    }

    @Test
    void testLogin_unverifiedAccount_throwsException() {
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("john@gmail.com");
        req.setPassword("password123");

        User user = User.builder()
                .email("john@gmail.com")
                .isActive(false)
                .isEmailVerified(false)
                .build();

        when(userRepository.findByEmail("john@gmail.com")).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> userService.login(req));
    }

    // ────────── FORGOT / RESET PASSWORD TESTS ──────────

    @Test
    void testForgotPassword_knownEmail_sendsOtp() {
        User user = User.builder().email("john@gmail.com").build();
        when(userRepository.findByEmail("john@gmail.com")).thenReturn(Optional.of(user));
        doNothing().when(otpService).generateAndSendOtp(anyString(), any());

        String result = userService.forgotPassword("john@gmail.com");
        assertTrue(result.contains("OTP"));
    }

    @Test
    void testForgotPassword_unknownEmail_throwsException() {
        when(userRepository.findByEmail("unknown@gmail.com")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> userService.forgotPassword("unknown@gmail.com"));
    }
}
