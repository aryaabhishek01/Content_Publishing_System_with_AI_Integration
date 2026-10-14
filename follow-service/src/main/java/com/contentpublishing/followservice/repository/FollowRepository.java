package com.contentpublishing.followservice.repository;

import com.contentpublishing.followservice.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    Optional<Follow> findByFollowerIdAndFollowingId(Long followerId, Long followingId);

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    List<Follow> findByFollowerId(Long followerId);

    List<Follow> findByFollowingId(Long followingId);

    long countByFollowerId(Long followerId);

    long countByFollowingId(Long followingId);

    @Query("SELECT f.followingId FROM Follow f WHERE f.followerId = :userId")
    List<Long> findFollowingIds(Long userId);

    @Query("SELECT f.followerId FROM Follow f WHERE f.followingId = :userId")
    List<Long> findFollowerIds(Long userId);
}
