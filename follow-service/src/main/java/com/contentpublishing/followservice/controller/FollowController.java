package com.contentpublishing.followservice.controller;

import com.contentpublishing.followservice.service.FollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FollowController {

    private final FollowService followService;

    @PostMapping("/api/follows/{targetUserId}")
    public ResponseEntity<Map<String, Object>> toggleFollow(
            @RequestHeader("X-User-Id") Long followerId,
            @PathVariable Long targetUserId) {
        return ResponseEntity.ok(followService.toggleFollow(followerId, targetUserId));
    }

    @GetMapping("/api/follows/{userId}/following")
    public ResponseEntity<List<Long>> getFollowing(@PathVariable Long userId) {
        return ResponseEntity.ok(followService.getFollowingIds(userId));
    }

    @GetMapping("/api/follows/{userId}/followers")
    public ResponseEntity<List<Long>> getFollowers(@PathVariable Long userId) {
        return ResponseEntity.ok(followService.getFollowerIds(userId));
    }

    @GetMapping("/api/follows/{userId}/counts")
    public ResponseEntity<Map<String, Long>> getCounts(@PathVariable Long userId) {
        return ResponseEntity.ok(followService.getCounts(userId));
    }

    @GetMapping("/api/follows/is-following/{targetUserId}")
    public ResponseEntity<Map<String, Boolean>> isFollowing(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long targetUserId) {
        return ResponseEntity.ok(Map.of("following", followService.isFollowing(userId, targetUserId)));
    }

    @GetMapping("/api/follows/mutual/{otherUserId}")
    public ResponseEntity<Map<String, Boolean>> areMutualFollowers(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long otherUserId) {
        return ResponseEntity.ok(Map.of("mutual", followService.areMutualFollowers(userId, otherUserId)));
    }

    @DeleteMapping("/api/follows/followers/{followerId}")
    public ResponseEntity<Map<String, Object>> removeFollower(
            @RequestHeader("X-User-Id") Long currentUserId,
            @PathVariable Long followerId) {
        return ResponseEntity.ok(followService.removeFollower(currentUserId, followerId));
    }

    @PostMapping("/api/follows/followers/{followerId}/remove")
    public ResponseEntity<Map<String, Object>> removeFollowerPost(
            @RequestHeader("X-User-Id") Long currentUserId,
            @PathVariable Long followerId) {
        return ResponseEntity.ok(followService.removeFollower(currentUserId, followerId));
    }

    @DeleteMapping("/api/follows/{targetUserId}")
    public ResponseEntity<Map<String, Object>> unfollow(
            @RequestHeader("X-User-Id") Long currentUserId,
            @PathVariable Long targetUserId) {
        return ResponseEntity.ok(followService.unfollow(currentUserId, targetUserId));
    }
}
