package com.pratham.foodreview.backend.controller;

import com.pratham.foodreview.backend.dto.CreateReviewRequest;
import com.pratham.foodreview.backend.dto.ReviewResponse;
import com.pratham.foodreview.backend.service.ReviewFeedService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/reviewfeed")
public class ReviewFeedController {

    private final ReviewFeedService reviewFeedService;

    public ReviewFeedController(ReviewFeedService reviewFeedService) {
        this.reviewFeedService = reviewFeedService;
    }

    @PostMapping
    public ReviewResponse createReview(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody CreateReviewRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return reviewFeedService.createReview(userId, request);
    }

    @GetMapping("/feed")
    public List<ReviewResponse> getFriendsFeed(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return reviewFeedService.getFriendsFeed(userId);
    }

    @GetMapping("/user/{userId}")
    public List<ReviewResponse> getUserReviews(@PathVariable UUID userId) {
        return reviewFeedService.getUserReviews(userId);
    }

    @GetMapping("/{reviewId}")
    public ReviewResponse getReview(@PathVariable UUID reviewId) {
        return reviewFeedService.getReview(reviewId);
    }

    @GetMapping("/my-reviews")
    public List<ReviewResponse> getMyReviews(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return reviewFeedService.getUserReviews(userId);
    }
}
