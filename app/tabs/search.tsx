import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/components/services/supabase";
import * as Location from "expo-location";
import { router } from "expo-router";

interface Restaurant {
  provider: string;
  providerId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: number;
}

export default function SearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Permission to access location was denied");
        // Default to Columbus, OH coordinates
        setLocation({ lat: 39.9612, lng: -82.9988 });
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      });
    })();
  }, []);

  const search = async () => {
    if (!query.trim() || !location) return;

    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch(
        `http://localhost:8080/restaurants/search?query=${encodeURIComponent(
          query
        )}&lat=${location.lat}&lng=${location.lng}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRestaurant = (restaurant: Restaurant) => {
    // Navigate to create review screen with restaurant data
    router.push({
      pathname: "/reviews/create",
      params: {
        provider: restaurant.provider,
        providerId: restaurant.providerId,
        name: restaurant.name,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
      },
    });
  };

  const renderRating = (rating?: number) => {
    if (!rating) return null;
    return (
      <View style={styles.ratingContainer}>
        <Ionicons name="star" size={14} color="#FFB800" />
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return <Text style={styles.priceLevel}>{"$".repeat(level)}</Text>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Find Restaurants</Text>
          <Text style={styles.subtitle}>Search and review your favorite places</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              placeholder="Search for restaurants..."
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
              style={styles.searchInput}
              placeholderTextColor="#999"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </Pressable>
            )}
          </View>
        </View>

        {locationError && (
          <View style={styles.locationError}>
            <Ionicons name="location-outline" size={16} color="#FF6B6B" />
            <Text style={styles.locationErrorText}>{locationError}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Searching restaurants...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.providerId}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              query.length > 0 && !loading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="restaurant-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyText}>No restaurants found</Text>
                  <Text style={styles.emptySubtext}>Try a different search term</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={styles.restaurantCard}
                onPress={() => handleSelectRestaurant(item)}
              >
                <View style={styles.restaurantInfo}>
                  <Text style={styles.restaurantName}>{item.name}</Text>
                  <Text style={styles.restaurantAddress} numberOfLines={2}>
                    {item.address}
                  </Text>
                  <View style={styles.restaurantMeta}>
                    {renderRating(item.rating)}
                    {renderPriceLevel(item.priceLevel)}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </Pressable>
            )}
          />
        )}
      </KeyboardAvoidingView>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
  },
  clearButton: {
    padding: 4,
  },
  locationError: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "#FFF5F5",
  },
  locationErrorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginLeft: 6,
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  restaurantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  restaurantInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 18,
  },
  restaurantMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  priceLevel: {
    fontSize: 13,
    color: "#4CAF50",
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
