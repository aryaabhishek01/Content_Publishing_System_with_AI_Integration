package com.contentpublishing.postservice.repository;

import com.contentpublishing.postservice.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findByIsActiveTrueOrderByCreatedAtDesc(Pageable pageable);

    List<Post> findByUserIdAndIsActiveTrueOrderByCreatedAtDesc(Long userId);

    @Query("SELECT DISTINCT p FROM Post p JOIN p.categories c WHERE c.id IN :categoryIds AND p.isActive = true ORDER BY p.createdAt DESC")
    Page<Post> findByCategoryIds(List<Long> categoryIds, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.userId IN :userIds AND p.isActive = true ORDER BY p.createdAt DESC")
    Page<Post> findByFollowedUsers(List<Long> userIds, Pageable pageable);

    long countByUserId(Long userId);
}
