package com.pratham.foodreview.backend.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reviews", schema = "public")
public class Review {

  @Id
  @GeneratedValue
  @Column(name = "id", columnDefinition = "uuid")
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private Profile user;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "restaurant_id", nullable = false)
  private Restaurant restaurant;

  @Column(name = "rating", nullable = false)
  private Integer rating;

  @Column(name = "text")
  private String text;

  @Type(JsonType.class)
  @Column(name = "photo_urls", columnDefinition = "jsonb")
  private List<String> photoUrls;

  @Column(name = "created_at")
  private OffsetDateTime createdAt;

  @Column(name = "updated_at")
  private OffsetDateTime updatedAt;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "dishes", columnDefinition = "text[]")
  private String[] dishes;

  // getters/setters
  public UUID getId() { return id; }
  public void setId(UUID id) { this.id = id; }

  public Profile getUser() { return user; }
  public void setUser(Profile user) { this.user = user; }

  public Restaurant getRestaurant() { return restaurant; }
  public void setRestaurant(Restaurant restaurant) { this.restaurant = restaurant; }

  public Integer getRating() { return rating; }
  public void setRating(Integer rating) { this.rating = rating; }

  public String getText() { return text; }
  public void setText(String text) { this.text = text; }

  public List<String> getPhotoUrls() { return photoUrls; }
  public void setPhotoUrls(List<String> photoUrls) { this.photoUrls = photoUrls; }

  public OffsetDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

  public String[] getDishes() {return dishes;}
  public void setDishes(String[] dishes) {this.dishes = dishes;}
}
