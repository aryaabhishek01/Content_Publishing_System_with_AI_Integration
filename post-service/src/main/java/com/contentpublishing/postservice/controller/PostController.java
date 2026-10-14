package com.contentpublishing.postservice.controller;

import com.contentpublishing.postservice.entity.*;
import com.contentpublishing.postservice.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // ── FEED ──
    @GetMapping("/api/posts/feed")
    public ResponseEntity<Page<Post>> getFeed(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) List<Long> followedUserIds,
            @RequestParam(required = false) List<Long> categoryIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(postService.getHomeFeed(followedUserIds, categoryIds, page, size));
    }

    // ── CREATE POST ──
    @PostMapping("/api/posts")
    public ResponseEntity<Post> createPost(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam String description,
            @RequestParam(required = false) String mood,
            @RequestParam(required = false) List<String> categories,
            @RequestParam(required = false) String customCategory,
            @RequestParam(required = false) MultipartFile mediaFile,
            @RequestParam String mediaType) throws IOException {
        return ResponseEntity.ok(postService.createPost(
                userId, description, mood, categories, customCategory, mediaFile, mediaType));
    }

    // ── GET POST ──
    @GetMapping("/api/posts/{postId}")
    public ResponseEntity<Post> getPost(@PathVariable Long postId) {
        return ResponseEntity.ok(postService.getPost(postId));
    }

    // ── USER POSTS ──
    @GetMapping("/api/posts/user/{userId}")
    public ResponseEntity<List<Post>> getUserPosts(@PathVariable Long userId) {
        return ResponseEntity.ok(postService.getUserPosts(userId));
    }

    // ── UPDATE POST ──
    @PutMapping("/api/posts/{postId}")
    public ResponseEntity<Post> updatePost(
            @PathVariable Long postId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(postService.updatePost(postId, userId, body.get("description")));
    }

    // ── DELETE POST ──
    @DeleteMapping("/api/posts/{postId}")
    public ResponseEntity<Map<String, String>> deletePost(
            @PathVariable Long postId,
            @RequestHeader("X-User-Id") Long userId) {
        postService.deletePost(postId, userId);
        return ResponseEntity.ok(Map.of("message", "Post deleted successfully"));
    }

    // ── LIKE TOGGLE ──
    @PostMapping("/api/posts/{postId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable Long postId,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(postService.toggleLike(postId, userId));
    }

    // ── COMMENTS ──
    @PostMapping("/api/posts/{postId}/comments")
    public ResponseEntity<Comment> addComment(
            @PathVariable Long postId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(postService.addComment(postId, userId, body.get("content")));
    }

    @GetMapping("/api/posts/{postId}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long postId) {
        return ResponseEntity.ok(postService.getComments(postId));
    }

    // ── CATEGORIES ──
    @GetMapping("/api/posts/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(postService.getAllCategories());
    }

    @GetMapping("/api/posts/categories/search")
    public ResponseEntity<List<Category>> searchCategories(@RequestParam String keyword) {
        return ResponseEntity.ok(postService.searchCategories(keyword));
    }
}
