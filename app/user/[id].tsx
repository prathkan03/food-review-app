import { useState, useEffect, useCallback } from "react";
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
import { useLocalSearchParams, router } from "expo-router";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

interface ProfileData {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  reviewCount: number;
  followerCount: number;
  followingCount: number;
}

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

type TabName = "Reviews" | "Photos";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("Reviews");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/users/${id}`);
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [id]);

  const fetchUserReviews = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/reviewfeed/user/${id}`);
      if (res.ok) {
        setReviews(await res.json());
      }
    } catch (error) {
      console.error("Error fetching user reviews:", error);
    }
  }, [id]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchUserReviews()]);
      setLoading(false);
    }
    loadData();
  }, [fetchProfile, fetchUserReviews]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchUserReviews()]);
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return "1 week ago";
    if (diffWeeks < 5) return `${diffWeeks} weeks ago`;
    return date.toLocaleDateString();
  };

  const formatCount = (n: number): string => {
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    return n.toString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderReviewCard = ({ item }: { item: Review }) => (
    <Pressable
      style={styles.reviewCard}
      onPress={() => router.push({ pathname: "/reviews/[id]", params: { id: item.id } })}
    >
      <View style={styles.reviewCardHeader}>
        <Text style={styles.reviewRestaurantName}>{item.restaurantName}</Text>
        <Pressable hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#999" />
        </Pressable>
      </View>

      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= item.rating ? "star" : "star-outline"}
            size={13}
            color={star <= item.rating ? "#FF6B35" : "#CCC"}
          />
        ))}
        <Text style={styles.ratingScore}>{item.rating.toFixed(1)}</Text>
        <Text style={styles.dotSeparator}>{" \u00B7 "}</Text>
        <Text style={styles.reviewTime}>{formatDate(item.createdAt)}</Text>
      </View>

      {item.text ? (
        <Text style={styles.reviewText} numberOfLines={3}>
          {item.text}
        </Text>
      ) : null}

      {item.photoUrls && item.photoUrls.length > 0 ? (
        <View style={styles.photoRow}>
          {item.photoUrls.slice(0, 3).map((url, index) => (
            <Image key={index} source={{ uri: url }} style={styles.photoThumb} />
          ))}
        </View>
      ) : null}

      <View style={styles.reviewActions}>
        <View style={styles.actionItem}>
          <Ionicons name="heart-outline" size={15} color="#999" />
          <Text style={styles.actionText}>24 LIKES</Text>
        </View>
        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={14} color="#999" />
          <Text style={styles.actionText}>8 COMMENTS</Text>
        </View>
      </View>
    </Pressable>
  );

  const renderProfileHeader = () => (
    <View>
      <View style={styles.avatarSection}>
        <View style={styles.avatarRing}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={36} color="#999" />
            </View>
          )}
        </View>
        <Pressable style={styles.followButton}>
          <Text style={styles.followButtonText}>Follow</Text>
        </Pressable>
      </View>

      <View style={styles.nameSection}>
        <Text style={styles.displayName}>
          {profile?.displayName || profile?.username || "User"}
        </Text>
        {profile?.username ? (
          <Text style={styles.username}>@{profile.username}</Text>
        ) : null}
      </View>

      {profile?.bio ? (
        <Text style={styles.bio}>{profile.bio}</Text>
      ) : null}

      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{formatCount(profile?.reviewCount ?? 0)}</Text>
          <Text style={styles.statLabel}>REVIEWS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{formatCount(profile?.followerCount ?? 0)}</Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{formatCount(profile?.followingCount ?? 0)}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {(["Reviews", "Photos"] as TabName[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {profile?.username ? `@${profile.username}` : "Profile"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {activeTab === "Reviews" ? (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReviewCard}
          ListHeaderComponent={renderProfileHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => "placeholder"}
          renderItem={() => null}
          ListHeaderComponent={renderProfileHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>Photos coming soon</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F4F0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#999",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#F8F4F0",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  listContent: {
    paddingBottom: 30,
  },
  avatarSection: {
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#F8F4F0",
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarPlaceholder: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#E8E0D8",
    alignItems: "center",
    justifyContent: "center",
  },
  followButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 36,
    paddingVertical: 9,
    borderRadius: 24,
    marginTop: 12,
  },
  followButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  nameSection: {
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#F8F4F0",
  },
  displayName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  username: {
    fontSize: 14,
    color: "#999",
    marginTop: 2,
  },
  bio: {
    fontSize: 13,
    color: "#666",
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: 32,
    marginTop: 8,
    backgroundColor: "#F8F4F0",
  },
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E8E8E8",
    alignSelf: "center",
  },
  tabBar: {
    flexDirection: "row",
    marginTop: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E0D8",
    backgroundColor: "#F8F4F0",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B35",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#999",
  },
  activeTabText: {
    color: "#FF6B35",
    fontWeight: "600",
  },
  reviewCard: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewRestaurantName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 6,
  },
  dotSeparator: {
    fontSize: 13,
    color: "#999",
  },
  reviewTime: {
    fontSize: 13,
    color: "#999",
  },
  reviewText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginTop: 10,
  },
  photoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  reviewActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 12,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.3,
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
});
