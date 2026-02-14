package com.pratham.foodreview.backend.controller;

import com.pratham.foodreview.backend.dto.CreateReviewRequest;
import com.pratham.foodreview.backend.dto.ReviewResponse;
import com.pratham.foodreview.backend.dto.ReviewUpdate;
import com.pratham.foodreview.backend.service.ReviewService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/reviews")
public class ReviewServiceController {

    private final ReviewService reviewService;

    public ReviewServiceController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    public ReviewResponse createReview(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody CreateReviewRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return reviewService.createReview(userId, request);
    }

    @PutMapping("/{reviewId}")
    public ReviewResponse updateReview(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID reviewId,
            @RequestBody ReviewUpdate updateDetails) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return reviewService.updateReview(userId, reviewId, updateDetails);
    }
}
