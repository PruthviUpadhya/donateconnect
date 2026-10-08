package com.donateconnect.controller;

import com.donateconnect.dto.*;
import com.donateconnect.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private static final Map<String, String> otpStore = new ConcurrentHashMap<>();

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<Map<String, String>>> sendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is required"));
        }

        // Generate 6-digit OTP
        String otpCode = String.valueOf((int) (100000 + Math.random() * 900000));
        otpStore.put(email.toLowerCase(), otpCode);

        return ResponseEntity.ok(ApiResponse.success(
                "6-Digit OTP code sent successfully to " + email,
                Map.of("email", email, "otpCode", otpCode)
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> verifyOtp(@RequestBody OtpVerificationRequest request) {
        String email = request.getEmail().toLowerCase();
        String storedOtp = otpStore.get(email);

        if (storedOtp != null && storedOtp.equals(request.getOtpCode())) {
            otpStore.remove(email);
            return ResponseEntity.ok(ApiResponse.success("OTP Verified Successfully!", Map.of("verified", true)));
        } else {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid or Expired OTP code"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse authResponse = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Donor account registered successfully", authResponse));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Logged in successfully", authResponse));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponseDto>> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthenticated request"));
        }
        UserResponseDto userDto = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("User profile fetched successfully", userDto));
    }
}
