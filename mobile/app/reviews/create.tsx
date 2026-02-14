import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/components/services/supabase";

export default function CreateReview() {
  const params = useLocalSearchParams();
  const restaurantName = params.name as string;
  const restaurantAddress = params.address as string;
  const provider = params.provider as string;
  const providerId = params.providerId as string;
  const lat = params.lat ? parseFloat(params.lat as string) : undefined;
  const lng = params.lng ? parseFloat(params.lng as string) : undefined;

  const [dishes, setDishes] = useState<string[]>(['']);
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAnotherDish = () => {
    setDishes(prev => [...prev, '']);
  };

  const updateDish = (index: number, name: string) => {
    setDishes(prev => prev.map((dish, i) => i === index ? name : dish));
  };

  const removeDish = (index: number) => {
    setDishes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const filledDishes = dishes.filter(d => d.trim() !== '');
    if (filledDishes.length === 0) {
      Alert.alert("Missing Info", "Please enter at least one dish name");
      return;
    }
    if (rating === 0) {
      Alert.alert("Missing Info", "Please rate your experience");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        Alert.alert("Error", "You must be logged in to submit a review");
        setIsSubmitting(false);
        return;
      }

      console.log(filledDishes);

      const reviewData = {
        provider,
        providerId,
        name: restaurantName,
        address: restaurantAddress,
        lat,
        lng,
        rating,
        text: '',
        dishes: filledDishes,
      };

      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(
          errorData.message ||
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      await response.json();

      Alert.alert("Success", "Your review has been submitted!", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to submit review. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FF6B35" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Add Your Review</Text>
        </View>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantImage}>
            <Ionicons name="restaurant" size={32} color="#FF6B35" />
          </View>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{restaurantName || "Restaurant Name"}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#999" />
              <Text style={styles.restaurantAddress}>{restaurantAddress || "Address"}</Text>
            </View>
          </View>
        </View>

        {/* What did you eat? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What did you eat?</Text>
          <Text style={styles.sectionSubtitle}>Add the dishes you ordered.</Text>

          {dishes.map((dish, index) => (
            <View key={index} style={styles.dishCard}>
              <View style={styles.dishHeader}>
                <Text style={styles.dishLabel}>DISH {index + 1}</Text>
                {dishes.length > 1 && (
                  <Pressable onPress={() => removeDish(index)}>
                    <Ionicons name="close-circle" size={24} color="#CCC" />
                  </Pressable>
                )}
              </View>
              <TextInput
                style={styles.dishInput}
                placeholder="e.g. Garlic Truffle Fries"
                placeholderTextColor="#CCC"
                value={dish}
                onChangeText={(text) => updateDish(index, text)}
              />
            </View>
          ))}

          {/* Add Another Dish */}
          <Pressable style={styles.addDishButton} onPress={addAnotherDish}>
            <Ionicons name="add-circle" size={24} color="#FF6B35" />
            <Text style={styles.addDishText}>Add another dish</Text>
          </Pressable>
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={40}
                  color={star <= rating ? "#FF6B35" : "#DDD"}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={[styles.continueButton, isSubmitting && styles.continueButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.continueButtonText}>
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </Text>
          {!isSubmitting && <Ionicons name="arrow-forward" size={20} color="#FFF" />}
        </Pressable>

        {/* Photo Hint */}
        <View style={styles.photoHint}>
          <View style={styles.photoIcon}>
            <Ionicons name="camera" size={24} color="#FF6B35" />
          </View>
          <View style={styles.photoTextContainer}>
            <Text style={styles.photoTitle}>Snap a photo?</Text>
            <Text style={styles.photoSubtitle}>You can add photos in the next step</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  cancelText: {
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "600",
  },
  restaurantCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  restaurantImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#FFF5F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  restaurantAddress: {
    fontSize: 13,
    color: "#999",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  dishCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dishHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dishLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.5,
  },
  dishInput: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  continueButton: {
    flexDirection: "row",
    backgroundColor: "#FF6B35",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  addDishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FF6B35",
    borderStyle: "dashed",
    gap: 8,
  },
  addDishText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  photoHint: {
    flexDirection: "row",
    backgroundColor: "#FFF5F0",
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  photoIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FFE8DC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  photoTextContainer: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  photoSubtitle: {
    fontSize: 13,
    color: "#666",
  },
});
