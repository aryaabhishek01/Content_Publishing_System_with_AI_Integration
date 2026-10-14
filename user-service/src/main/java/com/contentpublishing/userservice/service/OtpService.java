package com.contentpublishing.userservice.service;

import com.contentpublishing.userservice.config.RabbitMQConfig;
import com.contentpublishing.userservice.entity.OtpCode;
import com.contentpublishing.userservice.repository.OtpRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OtpService {

    private static final Logger logger = LoggerFactory.getLogger(OtpService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpRepository otpRepository;
    private final RabbitTemplate rabbitTemplate;
    private final JavaMailSender mailSender;

    @Value("${otp.expiry-minutes:10}")
    private int otpExpiryMinutes;

    /**
     * Generate a 6-digit OTP, persist it, send via email, and optionally publish to RabbitMQ.
     */
    public void generateAndSendOtp(String email, OtpCode.OtpType type) {
        String otp = String.format("%06d", RANDOM.nextInt(999999));

        OtpCode otpCode = OtpCode.builder()
                .email(email)
                .otp(otp)
                .otpType(type)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpiryMinutes))
                .isUsed(false)
                .build();

        otpRepository.save(otpCode);

        // ── Primary: send OTP directly via JavaMailSender (Gmail SMTP) ──
        try {
            sendOtpEmail(email, otp, type);
            logger.info("OTP email sent directly to: {} for type: {}", email, type);
        } catch (Exception e) {
            logger.error("Failed to send OTP email to {}: {}", email, e.getMessage());
        }

        // ── Secondary: also publish to RabbitMQ (optional, for notification service) ──
        Map<String, String> message = new HashMap<>();
        message.put("email", email);
        message.put("otp", otp);
        message.put("type", type.name());

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.OTP_EXCHANGE,
                    RabbitMQConfig.OTP_ROUTING_KEY,
                    message
            );
            logger.info("OTP also published to RabbitMQ for: {}", email);
        } catch (Exception e) {
            logger.warn("RabbitMQ not available ({}), skipping async publish for: {}", e.getMessage(), email);
        }
    }

    /**
     * Build and send a styled HTML OTP email via Gmail SMTP.
     */
    private void sendOtpEmail(String toEmail, String otp, OtpCode.OtpType type) throws Exception {
        String subject = type == OtpCode.OtpType.REGISTRATION
                ? "ContentHub — Verify Your Account"
                : "ContentHub — Password Reset OTP";

        String actionLabel = type == OtpCode.OtpType.REGISTRATION
                ? "complete your registration"
                : "reset your password";

        String htmlBody = """
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:40px;border-radius:12px;">
                  <div style="text-align:center;margin-bottom:32px;">
                    <h1 style="color:#a78bfa;font-size:28px;margin:0;">✦ ContentHub</h1>
                    <p style="color:#94a3b8;margin-top:8px;">Share Your World</p>
                  </div>
                  <p style="color:#e2e8f0;font-size:16px;">Use the OTP below to <strong>%s</strong>:</p>
                  <div style="background:#1e293b;border:2px solid #a78bfa;border-radius:10px;text-align:center;padding:28px;margin:24px 0;">
                    <span style="font-size:42px;font-weight:bold;letter-spacing:16px;color:#a78bfa;">%s</span>
                  </div>
                  <p style="color:#94a3b8;font-size:14px;">This OTP is valid for <strong>%d minutes</strong>. Do not share it with anyone.</p>
                  <hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
                  <p style="color:#64748b;font-size:12px;text-align:center;">If you did not request this, please ignore this email.</p>
                </div>
                """.formatted(actionLabel, otp, otpExpiryMinutes);

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
        helper.setFrom("mejust99999@gmail.com", "ContentHub");
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlBody, true); // true = HTML
        mailSender.send(mimeMessage);
    }

    /**
     * Validate OTP — checks existence, expiry, and used status.
     */
    public boolean verifyOtp(String email, String otp, OtpCode.OtpType type) {
        Optional<OtpCode> otpCodeOpt = otpRepository.findLatestActiveOtp(email, type);

        if (otpCodeOpt.isEmpty()) {
            logger.warn("No active OTP found for email: {}", email);
            return false;
        }

        OtpCode otpCode = otpCodeOpt.get();

        if (otpCode.isExpired()) {
            logger.warn("OTP expired for email: {}", email);
            return false;
        }

        if (!otpCode.getOtp().equals(otp)) {
            logger.warn("Invalid OTP provided for email: {}", email);
            return false;
        }

        // Mark all OTPs of this type for this email as used
        otpRepository.markAllUsed(email, type);
        logger.info("OTP verified successfully for email: {}", email);
        return true;
    }

    /**
     * Scheduled cleanup of expired OTPs every hour.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void cleanupExpiredOtps() {
        otpRepository.deleteExpiredOtps(LocalDateTime.now());
        logger.info("Expired OTPs cleaned up");
    }
}
