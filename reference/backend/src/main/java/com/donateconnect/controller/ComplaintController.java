package com.donateconnect.controller;

import com.donateconnect.dto.ApiResponse;
import com.donateconnect.entity.Complaint;
import com.donateconnect.entity.User;
import com.donateconnect.repository.ComplaintRepository;
import com.donateconnect.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<Complaint>> fileComplaint(
            Authentication authentication,
            @RequestBody Map<String, String> request) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Complaint complaint = Complaint.builder()
                .user(user)
                .subject(request.getOrDefault("subject", "General Complaint"))
                .category(request.getOrDefault("category", "APP_ISSUE"))
                .description(request.getOrDefault("description", ""))
                .status("OPEN")
                .build();

        Complaint saved = complaintRepository.save(complaint);
        return ResponseEntity.ok(ApiResponse.success("Complaint filed successfully", saved));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<Complaint>>> getMyComplaints(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(ApiResponse.success("Fetched user complaints", complaintRepository.findByUserOrderByCreatedAtDesc(user)));
    }

    @GetMapping("/admin/all")
    public ResponseEntity<ApiResponse<List<Complaint>>> getAllComplaintsForAdmin() {
        return ResponseEntity.ok(ApiResponse.success("Fetched all system complaints", complaintRepository.findAllByOrderByCreatedAtDesc()));
    }

    @PatchMapping("/admin/{id}/resolve")
    public ResponseEntity<ApiResponse<Complaint>> resolveComplaint(
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        complaint.setStatus("RESOLVED");
        complaint.setAdminNotes(request.getOrDefault("adminNotes", "Resolved by Admin"));
        Complaint updated = complaintRepository.save(complaint);
        return ResponseEntity.ok(ApiResponse.success("Complaint marked as resolved", updated));
    }
}
