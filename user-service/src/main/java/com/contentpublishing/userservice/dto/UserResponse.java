package com.contentpublishing.userservice.dto;

import com.contentpublishing.userservice.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String name;
    private String username;
    private String email;
    private String profilePicture;
    private String bio;
    private Boolean isActive;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoggedIn;
    private Long followerCount;
    private Long followingCount;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(user.getEmail())
                .profilePicture(user.getProfilePicture())
                .bio(user.getBio())
                .isActive(user.getIsActive())
                .role(user.getRole().name())
                .createdAt(user.getCreatedAt())
                .lastLoggedIn(user.getLastLoggedIn())
                .build();
    }
}
