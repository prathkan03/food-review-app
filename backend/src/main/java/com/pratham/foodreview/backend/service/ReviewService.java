package com.pratham.foodreview.backend.service;

import com.pratham.foodreview.backend.dto.CreateReviewRequest;
import com.pratham.foodreview.backend.dto.ReviewUpdate;
import com.pratham.foodreview.backend.dto.ReviewResponse;
import com.pratham.foodreview.backend.entity.*;
import com.pratham.foodreview.backend.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final RestaurantRepository restaurantRepository;
    private final ProfileRepository profileRepository;

    public ReviewService(ReviewRepository reviewRepository,
                        RestaurantRepository restaurantRepository,
                        ProfileRepository profileRepository) {
        this.reviewRepository = reviewRepository;
        this.restaurantRepository = restaurantRepository;
        this.profileRepository = profileRepository;
    }

    @Transactional
    public ReviewResponse createReview(UUID userId, CreateReviewRequest request) {
        // Get or create restaurant
        Restaurant restaurant = restaurantRepository
            .findByProviderAndProviderId(request.provider(), request.providerId())
            .orElseGet(() -> {
                Restaurant newRestaurant = new Restaurant();
                newRestaurant.setProvider(request.provider());
                newRestaurant.setProviderId(request.providerId());
                newRestaurant.setName(request.name());
                newRestaurant.setAddress(request.address());
                newRestaurant.setLat(request.lat());
                newRestaurant.setLng(request.lng());
                return restaurantRepository.save(newRestaurant);
            });
        
        // Get user profile
        Profile user = profileRepository.findById(userId).orElseThrow(() -> new RuntimeException("User profile not found."));
        
        // Create review
        Review review = new Review();
        review.setUser(user);
        review.setRestaurant(restaurant);
        review.setRating(request.rating());
        review.setText(request.text());
        review.setDishes(request.dishes() != null ? request.dishes().toArray(new String[0]) : new String[0]);
        review.setCreatedAt(OffsetDateTime.now());
        review.setUpdatedAt(OffsetDateTime.now());

        Review savedReview = reviewRepository.save(review);
        return toReviewResponse(savedReview);
    }

    @Transactional
    public ReviewResponse updateReview(UUID userId, UUID reviewId, ReviewUpdate updateDetails){
        //get review
        Review review = reviewRepository.findById(reviewId).orElseThrow(() -> new RuntimeException("Review not found"));

        //check if user is the owner of the review
        if (!review.getUser().getId().equals(userId)) {
            throw new RuntimeException("User is not the owner of the review");
        }
        
        review.setDishes(updateDetails.dishes() != null ? updateDetails.dishes().toArray(new String[0]) : new String[0]);
        review.setRating(updateDetails.rating());
        review.setText(updateDetails.content());
        review.setUpdatedAt(OffsetDateTime.now());

        Review savedReview = reviewRepository.save(review);
        return toReviewResponse(savedReview);
    }
    
    private ReviewResponse toReviewResponse(Review review) {
        return new ReviewResponse(
            review.getId().toString(),
            review.getUser().getId().toString(),
            review.getUser().getUsername(),
            review.getUser().getAvatarUrl(),
            review.getRestaurant().getId().toString(),
            review.getRestaurant().getName(),
            review.getRestaurant().getAddress(),
            review.getRating(),
            review.getText(),
            review.getPhotoUrls(),
            extractItemsFromText(review.getText()),
            review.getCreatedAt().toString()
        );
    }

    private List<String> extractItemsFromText(String text) {
        // Simple extraction of food items from review text
        // This could be enhanced with NLP or AI
        if (text == null || text.isEmpty()) {
            return new ArrayList<>();
        }
        
        // For now, just return an empty list
        // In a real implementation, you might parse the text for food items
        return new ArrayList<>();
    }
}