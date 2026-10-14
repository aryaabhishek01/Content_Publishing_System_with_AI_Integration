package com.contentpublishing.postservice.service;

import com.contentpublishing.postservice.entity.*;
import com.contentpublishing.postservice.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.io.IOException;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PostServiceTest {

    @Mock private PostRepository postRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private LikeRepository likeRepository;
    @Mock private RabbitTemplate rabbitTemplate;

    @InjectMocks private PostService postService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreatePost_success() throws IOException {
        Long userId = 1L;
        String desc = "Loving the sunshine today!";
        String mood = "HAPPY";
        List<String> categories = List.of("Happy");

        Category cat = Category.builder().id(10L).name("Happy").build();
        when(categoryRepository.findByNameIgnoreCase("Happy")).thenReturn(Optional.of(cat));

        Post savedPost = Post.builder()
                .id(100L)
                .userId(userId)
                .description(desc)
                .mood(Post.Mood.HAPPY)
                .mediaType(Post.MediaType.PHOTO)
                .categories(List.of(cat))
                .isActive(true)
                .likeCount(0L)
                .commentCount(0L)
                .build();

        when(postRepository.save(any(Post.class))).thenReturn(savedPost);
        doNothing().when(rabbitTemplate).convertAndSend(anyString(), anyString(), any(Object.class));

        Post post = postService.createPost(userId, desc, mood, categories, null, null, "PHOTO");
        assertNotNull(post);
        assertEquals(100L, post.getId());
        assertEquals(userId, post.getUserId());
        verify(rabbitTemplate, times(1)).convertAndSend(eq("notification.exchange"), eq("notification.key"), any(Object.class));
    }

    @Test
    void testCreatePost_emptyDescription_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
                postService.createPost(1L, "", "HAPPY", List.of("Happy"), null, null, "PHOTO"));
    }

    @Test
    void testCreatePost_noCategories_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
                postService.createPost(1L, "Valid text", "HAPPY", Collections.emptyList(), null, null, "PHOTO"));
    }

    @Test
    void testToggleLike_addLike() {
        Long postId = 50L;
        Long userId = 2L;

        Post post = Post.builder()
                .id(postId)
                .userId(1L)
                .likeCount(2L)
                .isActive(true)
                .build();

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(likeRepository.findByPostIdAndUserId(postId, userId)).thenReturn(Optional.empty());
        when(likeRepository.save(any())).thenReturn(new Like());
        when(postRepository.save(any())).thenReturn(post);

        Map<String, Object> result = postService.toggleLike(postId, userId);
        assertTrue((Boolean) result.get("liked"));
        assertEquals(3L, result.get("likeCount"));
        verify(rabbitTemplate, times(1)).convertAndSend(eq("notification.exchange"), eq("notification.key"), any(Object.class));
    }

    @Test
    void testToggleLike_removeLike() {
        Long postId = 50L;
        Long userId = 2L;

        Post post = Post.builder()
                .id(postId)
                .userId(1L)
                .likeCount(3L)
                .isActive(true)
                .build();

        Like existingLike = Like.builder().id(101L).postId(postId).userId(userId).build();

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(likeRepository.findByPostIdAndUserId(postId, userId)).thenReturn(Optional.of(existingLike));
        doNothing().when(likeRepository).delete(existingLike);
        when(postRepository.save(any())).thenReturn(post);

        Map<String, Object> result = postService.toggleLike(postId, userId);
        assertFalse((Boolean) result.get("liked"));
        assertEquals(2L, result.get("likeCount"));
    }

    @Test
    void testAddComment_success() {
        Long postId = 50L;
        Long userId = 2L;
        String content = "Great post!";

        Post post = Post.builder()
                .id(postId)
                .userId(1L)
                .commentCount(5L)
                .isActive(true)
                .build();

        Comment savedComment = Comment.builder().id(99L).postId(postId).userId(userId).content(content).build();

        when(postRepository.findById(postId)).thenReturn(Optional.of(post));
        when(commentRepository.save(any())).thenReturn(savedComment);
        when(postRepository.save(any())).thenReturn(post);

        Comment result = postService.addComment(postId, userId, content);
        assertNotNull(result);
        assertEquals(content, result.getContent());
        assertEquals(6L, post.getCommentCount());
    }

    @Test
    void testDeletePost_unauthorized_throwsException() {
        Post post = Post.builder().id(50L).userId(1L).isActive(true).build();
        when(postRepository.findById(50L)).thenReturn(Optional.of(post));

        // User 2 trying to delete User 1's post
        assertThrows(IllegalArgumentException.class, () -> postService.deletePost(50L, 2L));
    }

    @Test
    void testDeletePost_success() {
        Post post = Post.builder().id(50L).userId(1L).isActive(true).build();
        when(postRepository.findById(50L)).thenReturn(Optional.of(post));
        when(postRepository.save(any())).thenReturn(post);

        postService.deletePost(50L, 1L);
        assertFalse(post.getIsActive());
    }
}
