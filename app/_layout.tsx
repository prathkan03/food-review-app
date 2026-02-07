import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/src/components/services/supabase";

export default function RootLayout() {
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
        setAuthed(!!data.session);
        setReady(true);
      };

      init();

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthed(!!session);
      });

      return () => {
        mounted = false;
        sub.subscription.unsubscribe();
      };
    }, []);

  useEffect(() => {
      if (!ready) return;

      const inAuthGroup = segments[0] === "auth";

      if (!authed && !inAuthGroup) {
        router.replace("/auth/login");
      }

      if (authed && inAuthGroup) {
        router.replace("/tabs");
      }
    }, [ready, authed, segments]);

    return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="reviews/create" options={{ presentation: "modal" }} />
      <Stack.Screen name="auth" />
      <Stack.Screen name="tabs" />
    </Stack>
  );

}
