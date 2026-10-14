package com.contentpublishing.userservice.repository;

import com.contentpublishing.userservice.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpCode, Long> {

    @Query("SELECT o FROM OtpCode o WHERE o.email = :email AND o.otpType = :type AND o.isUsed = false ORDER BY o.createdAt DESC LIMIT 1")
    Optional<OtpCode> findLatestActiveOtp(String email, OtpCode.OtpType type);

    @Modifying
    @Transactional
    @Query("DELETE FROM OtpCode o WHERE o.expiresAt < :now")
    void deleteExpiredOtps(LocalDateTime now);

    @Modifying
    @Transactional
    @Query("UPDATE OtpCode o SET o.isUsed = true WHERE o.email = :email AND o.otpType = :type")
    void markAllUsed(String email, OtpCode.OtpType type);
}
