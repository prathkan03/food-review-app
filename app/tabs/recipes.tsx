import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/components/services/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  items?: string[];
  timestamp: Date;
}

export default function RecipesTab() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your Recipe AI assistant. Click on food items from reviews to get recipe suggestions, or ask me anything about cooking!",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Check if we have items passed from a review
  useEffect(() => {
    // This will be implemented when clicking items from reviews
    // For now, it's a placeholder for the future functionality
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      // TODO: Implement actual AI API call here
      // For now, we'll simulate a response
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'll help you with that recipe! (This is a placeholder - AI integration coming soon)",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      setLoading(false);
    }
  };

  const generateRecipeFromItems = (items: string[]) => {
    const itemsList = items.join(", ");
    const prompt = `Can you suggest a recipe using these items: ${itemsList}?`;
    setInputText(prompt);
    // Auto-send the message
    setTimeout(() => sendMessage(), 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <View style={styles.messageHeader}>
          <Ionicons
            name={isUser ? "person-circle" : "restaurant"}
            size={24}
            color={isUser ? "#007AFF" : "#34C759"}
          />
          <Text style={styles.messageRole}>
            {isUser ? "You" : "Recipe AI"}
          </Text>
        </View>
        <Text style={styles.messageContent}>{item.content}</Text>
        {item.items && item.items.length > 0 && (
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsLabel}>Items mentioned:</Text>
            <View style={styles.itemsList}>
              {item.items.map((foodItem, index) => (
                <View key={index} style={styles.itemChip}>
                  <Text style={styles.itemText}>{foodItem}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipe AI</Text>
        <Text style={styles.subtitle}>
          Get recipe suggestions from review items
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.chatContainer}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about recipes or cooking tips..."
            placeholderTextColor="#999"
            multiline
            editable={!loading}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickActionButton}
          onPress={() =>
            setInputText("What's a quick and healthy dinner recipe?")
          }
        >
          <Text style={styles.quickActionText}>Quick Dinner</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionButton}
          onPress={() =>
            setInputText("How do I make homemade pasta?")
          }
        >
          <Text style={styles.quickActionText}>Pasta Recipe</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionButton}
          onPress={() =>
            setInputText("What are some vegetarian protein sources?")
          }
        >
          <Text style={styles.quickActionText}>Vegetarian</Text>
        </Pressable>
      </View>
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
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 100,
  },
  messageContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    maxWidth: "85%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E5E7",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  messageRole: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 20,
    color: "#1A1A1A",
  },
  itemsContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  itemsLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
    fontWeight: "500",
  },
  itemsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  itemChip: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemText: {
    fontSize: 12,
    color: "#333",
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
    color: "#1A1A1A",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  quickActions: {
    position: "absolute",
    bottom: 80,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 16,
  },
  quickActionText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "500",
  },
});
