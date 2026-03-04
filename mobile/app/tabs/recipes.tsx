import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RecipeCard {
  title: string;
  imageUrl?: string;
  ingredients: string[];
  steps: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  recipe?: RecipeCard;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  icon: string;
  messages: Message[];
}

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "recipe_sessions_v1";

const serializeSessions = (sessions: ChatSession[]): string =>
  JSON.stringify(
    sessions.map((s) => ({
      ...s,
      messages: s.messages.map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      })),
    }))
  );

const deserializeSessions = (json: string): ChatSession[] => {
  const data = JSON.parse(json);
  return data.map((s: any) => ({
    ...s,
    messages: s.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })),
  }));
};

const QUICK_ACTIONS = [
  { label: "Vegan swap?", prompt: "How can I make this recipe vegan-friendly?" },
  { label: "Wine pairing", prompt: "What wine pairs well with this dish?" },
  { label: "Calories?", prompt: "What's the approximate calorie count for this recipe?" },
  { label: "Save to Book", prompt: "Save this recipe to my cookbook" },
];

const SUGGESTIONS = [
  {
    label: "Recipe from my last review",
    icon: "chatbubble-ellipses-outline",
    prompt: "Give me a recipe from my last restaurant review",
  },
  {
    label: "Healthy alternatives",
    icon: "shield-checkmark-outline",
    prompt: "Suggest healthy alternatives to my favorite dishes",
  },
  {
    label: "Quick 20-min meals",
    icon: "timer-outline",
    prompt: "Give me quick 20-minute meal ideas",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RecipesTab() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const isWide = width >= 700;
  const [sidebarOpen, setSidebarOpen] = useState(isWide);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  // Load persisted sessions on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) {
        try {
          setSessions(deserializeSessions(json));
        } catch {
          setSessions([]);
        }
      }
      setSessionsLoaded(true);
    });
  }, []);

  // Persist sessions whenever they change (after initial load)
  useEffect(() => {
    if (!sessionsLoaded) return;
    AsyncStorage.setItem(STORAGE_KEY, serializeSessions(sessions));
  }, [sessions, sessionsLoaded]);

  useEffect(() => {
    setSidebarOpen(isWide);
  }, [isWide]);

  useEffect(() => {
    const dishName = params.dish as string | undefined;
    const restaurantName = params.restaurantName as string | undefined;
    const providerId = params.providerId as string | undefined;

    if (dishName && restaurantName && !hasAutoFetched) {
      setHasAutoFetched(true);
      fetchIngredients(dishName, restaurantName, providerId);
    }
  }, [params.dish, params.restaurantName]);

  const fetchIngredients = async (
    dishName: string,
    restaurantName: string,
    providerId?: string
  ) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: dishName,
      icon: "sparkles-outline",
      messages: [
        {
          id: `user-${newId}`,
          role: "user",
          content: `Get the recipe for "${dishName}" from ${restaurantName}`,
          timestamp: new Date(),
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    if (!isWide) setSidebarOpen(false);
    setLoading(true);

    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${API_URL}/ingredients/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dish_name: dishName,
          restaurant_name: restaurantName,
          restaurant_provider_id: providerId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, I couldn't find the recipe for "${dishName}". ${errorData.detail || errorData.error || "Please try again later."}`,
          timestamp: new Date(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === newId ? { ...s, messages: [...s.messages, assistantMsg] } : s
          )
        );
        return;
      }

      const data = await response.json();
      const introMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I found "${data.matched_dish}" on ${restaurantName}'s menu (${Math.round(data.match_confidence * 100)}% match). Here are the ingredients:`,
        timestamp: new Date(),
      };
      const recipeMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: "",
        recipe: {
          title: data.matched_dish,
          ingredients: data.ingredients,
          steps: data.steps || [],
        },
        timestamp: new Date(),
      };
      const sourceMsg: Message = {
        id: (Date.now() + 3).toString(),
        role: "assistant",
        content: data.source_url
          ? `Source: ${data.source_url}${data.cached ? " (cached)" : ""}`
          : "Ingredients extracted from the restaurant's menu.",
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === newId
            ? { ...s, title: data.matched_dish, messages: [...s.messages, introMsg, recipeMsg, sourceMsg] }
            : s
        )
      );
    } catch (error) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't connect to the recipe service. Please make sure the server is running and try again.",
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === newId ? { ...s, messages: [...s.messages, errMsg] } : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const activeSession = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId) ?? null
    : null;

  const isEmpty = activeSession === null;

  const handleNewChat = () => {
    setActiveSessionId(null);
    if (!isWide) setSidebarOpen(false);
  };

  const selectSession = (id: string) => {
    setActiveSessionId(id);
    if (!isWide) setSidebarOpen(false);
  };

  const sendWithText = async (text: string) => {
    if (!text.trim()) return;

    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: text.length > 30 ? text.slice(0, 30) + "…" : text,
      icon: "restaurant-outline",
      messages: [
        {
          id: `user-${newId}`,
          role: "user",
          content: text,
          timestamp: new Date(),
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    if (!isWide) setSidebarOpen(false);
    setLoading(true);

    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'll help you with that recipe! (AI integration coming soon)",
        timestamp: new Date(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === newId ? { ...s, messages: [...s.messages, assistantMessage] } : s
        )
      );
      setLoading(false);
    }, 1000);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText("");

    if (isEmpty) {
      sendWithText(text);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: [...s.messages, userMessage] }
          : s
      )
    );
    setLoading(true);

    try {
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I'll help you with that recipe! (AI integration coming soon)",
          timestamp: new Date(),
        };
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, assistantMessage] }
              : s
          )
        );
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
      setLoading(false);
    }
  };

  /* ---------- Sidebar ---------- */
  const renderSidebar = () => {
    const visible = isWide || sidebarOpen;
    if (!visible) return null;
    return (
      <View style={[styles.sidebar, !isWide && styles.sidebarMobile]}>
        <Pressable style={styles.newRecipeBtn} onPress={handleNewChat}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.newRecipeBtnText}>New Recipe</Text>
        </Pressable>

        <Text style={styles.historyLabel}>HISTORY</Text>

        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <Pressable
                key={session.id}
                style={[styles.historyItem, isActive && styles.historyItemActive]}
                onPress={() => selectSession(session.id)}
              >
                <Ionicons
                  name={session.icon as any}
                  size={18}
                  color={isActive ? "#FF6B35" : "#999"}
                />
                <Text
                  style={[styles.historyItemText, isActive && styles.historyItemTextActive]}
                  numberOfLines={1}
                >
                  {session.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sidebarBottom}>
          <Pressable style={styles.sidebarBottomIcon} onPress={() => setSidebarOpen(false)}>
            <Ionicons name="chevron-back" size={20} color="#999" />
          </Pressable>
        </View>
      </View>
    );
  };

  /* ---------- Recipe Card ---------- */
  const renderRecipeCard = (recipe: RecipeCard) => (
    <View style={styles.recipeCard}>
      <View style={styles.recipeImageContainer}>
        {recipe.imageUrl ? (
          <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} resizeMode="cover" />
        ) : (
          <View style={styles.recipeImagePlaceholder}>
            <Ionicons name="restaurant" size={48} color="#DDD" />
          </View>
        )}
        <View style={styles.recipeImageOverlay}>
          <Text style={styles.recipeImageTitle}>{recipe.title}</Text>
        </View>
      </View>

      <View style={styles.recipeSection}>
        <View style={styles.recipeSectionHeader}>
          <Text style={styles.recipeSectionEmoji}>{"🧾"}</Text>
          <Text style={styles.recipeSectionTitle}>WHAT YOU'LL NEED</Text>
        </View>
        <View style={styles.ingredientsGrid}>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingredientItem}>
              <Ionicons name="ellipse" size={6} color="#FF6B35" />
              <Text style={styles.ingredientText}>{ing}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.recipeSection}>
        <View style={styles.recipeSectionHeader}>
          <Text style={styles.recipeSectionEmoji}>{"🔥"}</Text>
          <Text style={styles.recipeSectionTitle}>STEP-BY-STEP GUIDE</Text>
        </View>
        {recipe.steps.map((step, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  /* ---------- Empty State ---------- */
  const renderEmptyState = () => (
    <ScrollView
      contentContainerStyle={styles.emptyStateContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Ionicons name="sparkles" size={36} color="#FFF" />
      </View>

      <Text style={styles.emptyTitle}>Gourmet AI</Text>
      <Text style={styles.emptySubtitle}>Which restaurant dish should we cook today?</Text>

      {/* Suggestion Cards */}
      <View style={styles.suggestionsContainer}>
        {SUGGESTIONS.map((s, i) => (
          <Pressable
            key={i}
            style={styles.suggestionCard}
            onPress={() => sendWithText(s.prompt)}
          >
            <View style={styles.suggestionIconWrap}>
              <Ionicons name={s.icon as any} size={18} color="#FF6B35" />
            </View>
            <Text style={styles.suggestionText}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );

  /* ---------- Chat Messages ---------- */
  const renderMessages = () => (
    <ScrollView
      ref={scrollRef}
      style={styles.chatScroll}
      contentContainerStyle={styles.chatContent}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
    >
      {activeSession!.messages.map((msg) => {
        if (msg.role === "assistant") {
          return (
            <View key={msg.id}>
              {msg.content ? (
                <View style={styles.assistantRow}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="sparkles" size={14} color="#FFF" />
                  </View>
                  <View style={styles.assistantBubble}>
                    <Text style={styles.assistantText}>{msg.content}</Text>
                  </View>
                </View>
              ) : null}
              {msg.recipe && renderRecipeCard(msg.recipe)}
            </View>
          );
        }

        return (
          <View key={msg.id} style={styles.userRow}>
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{msg.content}</Text>
            </View>
          </View>
        );
      })}

      {loading && (
        <View style={styles.assistantRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="sparkles" size={14} color="#FFF" />
          </View>
          <View style={styles.assistantBubble}>
            <ActivityIndicator size="small" color="#FF6B35" />
          </View>
        </View>
      )}
    </ScrollView>
  );

  /* ---------- Main Render ---------- */
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainLayout}>
        {renderSidebar()}

        {!isWide && sidebarOpen && (
          <Pressable style={styles.overlay} onPress={() => setSidebarOpen(false)} />
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatArea}
          keyboardVerticalOffset={90}
        >
          {/* Header — only shown when in a session */}
          {!isEmpty && (
            <View style={styles.chatHeader}>
              {!isWide && (
                <Pressable style={styles.menuBtn} onPress={() => setSidebarOpen(true)}>
                  <Ionicons name="menu" size={24} color="#1A1A1A" />
                </Pressable>
              )}
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                  {activeSession!.title}
                </Text>
                <Text style={styles.chatHeaderSubtitle}>INSPIRED BY YOUR REVIEWS</Text>
              </View>
              <View style={styles.chatHeaderActions}>
                <Pressable style={styles.headerActionBtn}>
                  <Ionicons name="heart-outline" size={22} color="#1A1A1A" />
                </Pressable>
                <Pressable style={styles.headerActionBtn}>
                  <Ionicons name="share-outline" size={22} color="#1A1A1A" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Menu button on empty state */}
          {isEmpty && !isWide && (
            <View style={styles.emptyHeader}>
              <Pressable onPress={() => setSidebarOpen(true)}>
                <Ionicons name="menu" size={24} color="#1A1A1A" />
              </Pressable>
            </View>
          )}

          {/* Body */}
          {isEmpty ? renderEmptyState() : renderMessages()}

          {/* Input Area */}
          <View style={styles.inputArea}>
            {/* Quick Actions */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickActionsScroll}
              contentContainerStyle={styles.quickActionsContent}
            >
              {QUICK_ACTIONS.map((action, i) => (
                <Pressable
                  key={i}
                  style={styles.quickActionChip}
                  onPress={() => setInputText(action.prompt)}
                >
                  <Text style={styles.quickActionText}>{action.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.inputRow}>
              <Pressable style={styles.attachBtn}>
                <Ionicons name="attach-outline" size={22} color="#999" />
              </Pressable>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask a question..."
                placeholderTextColor="#BBBBBB"
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                editable={!loading}
              />
              <Pressable
                style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F4F0",
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },

  /* ---- Sidebar ---- */
  sidebar: {
    width: 220,
    backgroundColor: "#FAFAFA",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F0",
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  sidebarMobile: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 5,
  },
  newRecipeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 20,
  },
  newRecipeBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  historyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
    gap: 10,
  },
  historyItemActive: {
    backgroundColor: "#FFF5F0",
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B35",
  },
  historyItemText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  historyItemTextActive: {
    color: "#FF6B35",
    fontWeight: "600",
  },
  sidebarBottom: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    alignItems: "center",
  },
  sidebarBottomIcon: {
    padding: 8,
  },

  /* ---- Chat Area ---- */
  chatArea: {
    flex: 1,
    backgroundColor: "#F8F4F0",
  },
  emptyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE8E3",
    backgroundColor: "#F8F4F0",
  },
  menuBtn: {
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  chatHeaderSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF6B35",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerActionBtn: {
    padding: 4,
  },

  /* ---- Empty State ---- */
  emptyStateContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  suggestionsContainer: {
    width: "100%",
    gap: 12,
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionText: {
    fontSize: 15,
    color: "#1A1A1A",
    fontWeight: "500",
  },

  /* ---- Messages ---- */
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 20,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 10,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  assistantBubble: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#1A1A1A",
  },
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  userBubble: {
    maxWidth: "80%",
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#FFF",
  },

  /* ---- Recipe Card ---- */
  recipeCard: {
    marginLeft: 42,
    marginBottom: 16,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recipeImageContainer: {
    width: "100%",
    height: 180,
    position: "relative",
  },
  recipeImage: {
    width: "100%",
    height: "100%",
  },
  recipeImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  recipeImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  recipeImageTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFF",
  },
  recipeSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  recipeSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  recipeSectionEmoji: {
    fontSize: 14,
  },
  recipeSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FF6B35",
    letterSpacing: 0.5,
  },
  ingredientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  ingredientItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingRight: 8,
  },
  ingredientText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: "#333",
  },

  /* ---- Input Area ---- */
  inputArea: {
    backgroundColor: "#F8F4F0",
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 16 : 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  quickActionsScroll: {},
  quickActionsContent: {
    gap: 8,
    paddingRight: 8,
  },
  quickActionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
  },
  quickActionText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  attachBtn: {
    padding: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A1A",
    paddingVertical: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#DDD",
  },
});
