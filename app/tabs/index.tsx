import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/components/services/supabase";
import { router } from "expo-router";

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  rating: number;
  text: string;
  photoUrls?: string[];
  items?: string[];
  createdAt: string;
}

export default function HomeTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchFriendsReviews();
  }, []);

  const fetchFriendsReviews = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(
        `http://localhost:8080/reviews/feed`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const feedData = await res.json();
        setReviews(feedData);
      }
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFriendsReviews();
  };

  const handleReviewPress = (review: Review) => {
    router.push({
      pathname: "/reviews/[id]",
      params: { id: review.id },
    });
  };

  const renderRating = (rating: number) => {
    return (
      <View style={styles.ratingContainer}>
        {[...Array(5)].map((_, i) => (
          <Ionicons
            key={i}
            name={i < rating ? "star" : "star-outline"}
            size={16}
            color="#FFB800"
          />
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.subtitle}>Recent reviews from friends</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading feed...</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No reviews yet</Text>
              <Text style={styles.emptySubtext}>Follow friends to see their reviews</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.reviewCard}
              onPress={() => handleReviewPress(item)}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.userInfo}>
                  {item.userAvatar ? (
                    <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={20} color="#999" />
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{item.userName}</Text>
                    <Text style={styles.reviewDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{item.restaurantName}</Text>
                <Text style={styles.restaurantAddress} numberOfLines={1}>
                  {item.restaurantAddress}
                </Text>
              </View>

              {renderRating(item.rating)}

              {item.text && (
                <Text style={styles.reviewText} numberOfLines={3}>
                  {item.text}
                </Text>
              )}

              {item.items && item.items.length > 0 && (
                <View style={styles.itemsContainer}>
                  <Text style={styles.itemsLabel}>Reviewed items:</Text>
                  <View style={styles.itemsList}>
                    {item.items.slice(0, 3).map((foodItem, index) => (
                      <View key={index} style={styles.itemChip}>
                        <Text style={styles.itemText}>{foodItem}</Text>
                      </View>
                    ))}
                    {item.items.length > 3 && (
                      <Text style={styles.moreItems}>+{item.items.length - 3} more</Text>
                    )}
                  </View>
                </View>
              )}

              {item.photoUrls && item.photoUrls.length > 0 && (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: item.photoUrls[0] }}
                    style={styles.reviewPhoto}
                  />
                  {item.photoUrls.length > 1 && (
                    <View style={styles.morePhotos}>
                      <Text style={styles.morePhotosText}>+{item.photoUrls.length - 1}</Text>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  listContainer: {
    paddingVertical: 12,
  },
  reviewCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  reviewDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  restaurantInfo: {
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: "#666",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  itemsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  itemChip: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  itemText: {
    fontSize: 13,
    color: "#333",
  },
  moreItems: {
    fontSize: 13,
    color: "#007AFF",
    alignSelf: "center",
  },
  photoContainer: {
    position: "relative",
  },
  reviewPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  morePhotos: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  morePhotosText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
});
