package com.contentpublishing.postservice.service;

import com.contentpublishing.postservice.entity.*;
import com.contentpublishing.postservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private static final Logger logger = LoggerFactory.getLogger(PostService.class);

    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final RabbitTemplate rabbitTemplate;
    private final JdbcTemplate jdbcTemplate;

    // ────────────────────────────────────────────────────────────
    // FEED
    // ────────────────────────────────────────────────────────────

    public Page<Post> getHomeFeed(List<Long> followedUserIds, List<Long> categoryIds, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> result;

        if (categoryIds != null && !categoryIds.isEmpty()) {
            result = postRepository.findByCategoryIds(categoryIds, pageable);
        } else if (followedUserIds != null && !followedUserIds.isEmpty()) {
            result = postRepository.findByFollowedUsers(followedUserIds, pageable);
        } else {
            result = postRepository.findByIsActiveTrueOrderByCreatedAtDesc(pageable);
        }
        enrichPostsWithUserInfo(result.getContent());
        return result;
    }

    // ────────────────────────────────────────────────────────────
    // CREATE POST
    // ────────────────────────────────────────────────────────────

    @Transactional
    public Post createPost(Long userId, String description, String mood,
                           List<String> categoryNames, String customCategory,
                           MultipartFile mediaFile, String mediaType) throws IOException {

        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("Description cannot be empty");
        }

        // Resolve categories
        List<Category> categories = new ArrayList<>();
        if (categoryNames != null) {
            for (String name : categoryNames) {
                Category cat = categoryRepository.findByNameIgnoreCase(name)
                        .orElseGet(() -> categoryRepository.save(Category.builder().name(name).build()));
                categories.add(cat);
            }
        }

        // Handle "Other" custom category
        if (customCategory != null && !customCategory.isBlank()) {
            Category customCat = categoryRepository.findByNameIgnoreCase(customCategory)
                    .orElseGet(() -> categoryRepository.save(Category.builder().name(customCategory).build()));
            if (!categories.contains(customCat)) {
                categories.add(customCat);
            }
        }

        if (categories.isEmpty()) {
            throw new IllegalArgumentException("At least one category is required");
        }

        // Save media file
        String mediaUrl = null;
        if (mediaFile != null && !mediaFile.isEmpty()) {
            String uploadDir = "uploads/post-media/";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String fileName = UUID.randomUUID() + "_" + mediaFile.getOriginalFilename();
            Files.copy(mediaFile.getInputStream(), uploadPath.resolve(fileName));
            mediaUrl = "/uploads/post-media/" + fileName;
        }

        Post post = Post.builder()
                .userId(userId)
                .description(description)
                .mediaUrl(mediaUrl)
                .mediaType(Post.MediaType.valueOf(mediaType.toUpperCase()))
                .mood(mood != null ? Post.Mood.valueOf(mood.toUpperCase()) : Post.Mood.HAPPY)
                .categories(categories)
                .isActive(true)
                .likeCount(0L)
                .commentCount(0L)
                .build();

        Post saved = postRepository.save(post);

        // Publish notification event
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "NEW_POST");
            event.put("postId", saved.getId());
            event.put("userId", userId);
            rabbitTemplate.convertAndSend("notification.exchange", "notification.key", event);
        } catch (Exception e) {
            logger.warn("RabbitMQ unavailable for NEW_POST event: {}", e.getMessage());
        }

        logger.info("Post created: {} by user: {}", saved.getId(), userId);
        enrichPostsWithUserInfo(List.of(saved));
        return saved;
    }

    // ────────────────────────────────────────────────────────────
    // GET / UPDATE / DELETE
    // ────────────────────────────────────────────────────────────

    public Post getPost(Long postId) {
        Post post = postRepository.findById(postId)
                .filter(Post::getIsActive)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        enrichPostsWithUserInfo(List.of(post));
        return post;
    }

    public List<Post> getUserPosts(Long userId) {
        List<Post> posts = postRepository.findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(userId);
        enrichPostsWithUserInfo(posts);
        return posts;
    }

    @Transactional
    public Post updatePost(Long postId, Long userId, String description) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (!post.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not authorized to edit this post");
        }

        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("Description cannot be empty");
        }

        post.setDescription(description);
        Post saved = postRepository.save(post);
        enrichPostsWithUserInfo(List.of(saved));
        return saved;
    }

    @Transactional
    public void deletePost(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        if (!post.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Not authorized to delete this post");
        }

        post.setIsActive(false);
        postRepository.save(post);
        logger.info("Post soft-deleted: {} by user: {}", postId, userId);
    }

    // ────────────────────────────────────────────────────────────
    // LIKES
    // ────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> toggleLike(Long postId, Long userId) {
        Post post = getPost(postId);

        Optional<Like> existing = likeRepository.findByPostIdAndUserId(postId, userId);
        boolean liked;
        if (existing.isPresent()) {
            likeRepository.delete(existing.get());
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            liked = false;
        } else {
            likeRepository.save(Like.builder().postId(postId).userId(userId).build());
            post.setLikeCount(post.getLikeCount() + 1);
            liked = true;

            // Resilient notification sending
            sendNotification(post.getUserId(), userId, "LIKE", postId, "liked your post");
        }
        postRepository.save(post);
        return Map.of("liked", liked, "likeCount", post.getLikeCount());
    }

    // ────────────────────────────────────────────────────────────
    // COMMENTS
    // ────────────────────────────────────────────────────────────

    @Transactional
    public Comment addComment(Long postId, Long userId, String content) {
        Post post = getPost(postId);

        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Comment cannot be empty");
        }

        Comment comment = Comment.builder()
                .postId(postId)
                .userId(userId)
                .content(content)
                .build();
        Comment saved = commentRepository.save(comment);

        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        // Resilient notification sending
        sendNotification(post.getUserId(), userId, "COMMENT", postId, "commented on your post");

        enrichCommentsWithUserInfo(List.of(saved));
        return saved;
    }

    public List<Comment> getComments(Long postId) {
        List<Comment> comments = commentRepository.findByPostIdOrderByCreatedAtDesc(postId);
        enrichCommentsWithUserInfo(comments);
        return comments;
    }

    // ────────────────────────────────────────────────────────────
    // CATEGORIES
    // ────────────────────────────────────────────────────────────

    public List<Category> searchCategories(String keyword) {
        return categoryRepository.findByNameContainingIgnoreCase(keyword);
    }

    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    // ────────────────────────────────────────────────────────────
    // USER ENRICHMENT HELPERS
    // ────────────────────────────────────────────────────────────

    private void enrichPostsWithUserInfo(List<Post> posts) {
        if (posts == null || posts.isEmpty()) return;
        Set<Long> userIds = posts.stream().map(Post::getUserId).filter(Objects::nonNull).collect(Collectors.toSet());
        if (userIds.isEmpty()) return;

        Map<Long, Map<String, String>> userMap = fetchUsersInfo(userIds);
        for (Post p : posts) {
            Map<String, String> info = userMap.get(p.getUserId());
            if (info != null) {
                p.setAuthorName(info.get("name"));
                p.setUsername(info.get("username"));
                p.setAuthorProfilePicture(info.get("profilePicture"));
            }
        }
    }

    private void enrichCommentsWithUserInfo(List<Comment> comments) {
        if (comments == null || comments.isEmpty()) return;
        Set<Long> userIds = comments.stream().map(Comment::getUserId).filter(Objects::nonNull).collect(Collectors.toSet());
        if (userIds.isEmpty()) return;

        Map<Long, Map<String, String>> userMap = fetchUsersInfo(userIds);
        for (Comment c : comments) {
            Map<String, String> info = userMap.get(c.getUserId());
            if (info != null) {
                c.setAuthorName(info.get("name"));
                c.setUsername(info.get("username"));
                c.setAuthorProfilePicture(info.get("profilePicture"));
            }
        }
    }

    private Map<Long, Map<String, String>> fetchUsersInfo(Set<Long> userIds) {
        Map<Long, Map<String, String>> result = new HashMap<>();
        if (userIds == null || userIds.isEmpty()) return result;
        String inSql = String.join(",", Collections.nCopies(userIds.size(), "?"));
        String sql = String.format("SELECT id, name, username, profile_picture FROM users WHERE id IN (%s)", inSql);
        try {
            jdbcTemplate.query(sql, ps -> {
                int idx = 1;
                for (Long id : userIds) {
                    ps.setLong(idx++, id);
                }
            }, rs -> {
                long id = rs.getLong("id");
                Map<String, String> map = new HashMap<>();
                map.put("name", rs.getString("name"));
                map.put("username", rs.getString("username"));
                map.put("profilePicture", rs.getString("profile_picture"));
                result.put(id, map);
            });
        } catch (Exception e) {
            logger.warn("Could not enrich users info: {}", e.getMessage());
        }
        return result;
    }

    private void sendNotification(Long targetUserId, Long actorId, String type, Long referenceId, String actionText) {
        if (targetUserId == null || actorId == null || targetUserId.equals(actorId)) return;

        // 1. Try RabbitMQ first
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", type);
            event.put("postId", referenceId);
            event.put("actorId", actorId);
            event.put("targetUserId", targetUserId);
            rabbitTemplate.convertAndSend("notification.exchange", "notification.key", event);
        } catch (Exception e) {
            logger.debug("RabbitMQ unavailable for notification: {}", e.getMessage());
        }

        // 2. Direct DB fallback (guarantees delivery if RabbitMQ is offline)
        try {
            String actorName = null;
            try {
                actorName = jdbcTemplate.queryForObject("SELECT name FROM users WHERE id = ?", String.class, actorId);
            } catch (Exception ignored) {}

            String content = (actorName != null && !actorName.isBlank() ? actorName : "Someone") + " " + actionText;
            jdbcTemplate.update(
                "INSERT INTO notifications (user_id, actor_id, type, reference_id, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())",
                targetUserId, actorId, type, referenceId, content
            );
            logger.info("Notification saved directly in DB for user {} type {}", targetUserId, type);
        } catch (Exception ex) {
            logger.error("Failed to insert notification into DB: {}", ex.getMessage());
        }
    }
}
