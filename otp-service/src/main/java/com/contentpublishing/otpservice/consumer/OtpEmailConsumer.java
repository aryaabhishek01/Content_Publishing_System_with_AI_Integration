package com.contentpublishing.otpservice.consumer;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class OtpEmailConsumer {

    private static final Logger logger = LoggerFactory.getLogger(OtpEmailConsumer.class);

    private final JavaMailSender mailSender;

    @RabbitListener(queues = "otp.email.queue")
    public void consumeOtpMessage(Map<String, String> message) {
        String email = message.get("email");
        String otp = message.get("otp");
        String type = message.get("type");

        try {
            String subject = buildSubject(type);
            String body = buildBody(otp, type);

            SimpleMailMessage mailMessage = new SimpleMailMessage();
            mailMessage.setTo(email);
            mailMessage.setSubject(subject);
            mailMessage.setText(body);
            mailMessage.setFrom("noreply@contentpublishing.com");

            mailSender.send(mailMessage);
            logger.info("OTP email sent successfully to: {} for type: {}", email, type);
        } catch (Exception e) {
            logger.error("Failed to send OTP email to {}: {}", email, e.getMessage());
        }
    }

    private String buildSubject(String type) {
        return switch (type) {
            case "REGISTRATION" -> "Content Publishing System — Verify Your Account";
            case "PASSWORD_RESET" -> "Content Publishing System — Password Reset OTP";
            default -> "Content Publishing System — Your OTP";
        };
    }

    private String buildBody(String otp, String type) {
        String action = "REGISTRATION".equals(type)
                ? "complete your registration"
                : "reset your password";

        return String.format("""
                Hello,

                Your One-Time Password (OTP) to %s on Content Publishing System is:

                    %s

                This OTP is valid for 10 minutes. Do not share it with anyone.

                If you did not request this, please ignore this email.

                — Content Publishing System Team
                """, action, otp);
    }
}
