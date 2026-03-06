package com.pratham.foodreview.backend.controller;

import com.pratham.foodreview.backend.dto.ProfileResponse;
import com.pratham.foodreview.backend.entity.Profile;
import com.pratham.foodreview.backend.repo.FollowRepository;
import com.pratham.foodreview.backend.repo.ProfileRepository;
import com.pratham.foodreview.backend.repo.ReviewRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {

    private final ProfileRepository profileRepository;
    private final ReviewRepository reviewRepository;
    private final FollowRepository followRepository;

    public UserController(ProfileRepository profileRepository,
                          ReviewRepository reviewRepository,
                          FollowRepository followRepository) {
        this.profileRepository = profileRepository;
        this.reviewRepository = reviewRepository;
        this.followRepository = followRepository;
    }

    @GetMapping("/{id}")
    public ProfileResponse getUser(@PathVariable UUID id) {
        Profile profile = profileRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        long reviewCount = reviewRepository.countByUser_Id(id);
        long followerCount = followRepository.countByFollowing_Id(id);
        long followingCount = followRepository.countByFollower_Id(id);
        return new ProfileResponse(
            profile.getId().toString(),
            profile.getUsername(),
            profile.getDisplayName(),
            profile.getAvatarUrl(),
            profile.getBio(),
            reviewCount,
            followerCount,
            followingCount
        );
    }

    @GetMapping("/search")
    public List<ProfileResponse> searchUsers(@RequestParam String q) {
        if (q == null || q.isBlank() || q.length() < 1) {
            return List.of();
        }
        List<Profile> profiles = profileRepository.findByUsernamePrefix(
            q.trim(), PageRequest.of(0, 20)
        );
        return profiles.stream().map(p -> new ProfileResponse(
            p.getId().toString(),
            p.getUsername(),
            p.getDisplayName(),
            p.getAvatarUrl(),
            p.getBio(),
            0L, 0L, 0L
        )).toList();
    }
}
