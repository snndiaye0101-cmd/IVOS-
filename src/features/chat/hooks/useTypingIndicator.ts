// ============= TYPING INDICATOR HOOK =============
// Gère les indicateurs de saisie en temps réel

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/shared/services/supabaseClient";

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export function useTypingIndicator(
  channelId: string,
  userId: string,
  userName: string
) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async () => {
    try {
      const { error } = await supabase.from("typing_indicators").upsert(
        {
          channel_id: channelId,
          user_id: userId,
          user_name: userName,
          timestamp: Date.now(),
        },
        { onConflict: "channel_id,user_id" }
      );

      if (error) throw error;
      isTypingRef.current = true;

      // Clear timeout and set new one
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(async () => {
        // Remove typing indicator after 3 seconds
        try {
          await supabase
            .from("typing_indicators")
            .delete()
            .eq("channel_id", channelId)
            .eq("user_id", userId);
          isTypingRef.current = false;
        } catch (err) {
          console.error("Error clearing typing indicator:", err);
        }
      }, 3000);
    } catch (error) {
      console.error("Error sending typing indicator:", error);
    }
  }, [channelId, userId, userName]);

  // Subscribe to typing indicators
  useEffect(() => {
    const subscription = supabase
      .channel(`typing-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newUser = payload.new as TypingUser;
            setTypingUsers((prev) => {
              const filtered = prev.filter((u) => u.userId !== newUser.userId);
              return [...filtered, newUser];
            });

            // Auto-remove after 5 seconds if not updated
            setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter((u) => u.userId !== newUser.userId)
              );
            }, 5000);
          } else if (payload.eventType === "DELETE") {
            const deletedUser = payload.old as TypingUser;
            setTypingUsers((prev) =>
              prev.filter((u) => u.userId !== deletedUser.userId)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [channelId]);

  // Get typing users message
  const getTypingMessage = useCallback(() => {
    const otherUsers = typingUsers.filter((u) => u.userId !== userId);
    if (otherUsers.length === 0) return null;
    if (otherUsers.length === 1) return `${otherUsers[0].userName} est en train d'écrire...`;
    if (otherUsers.length === 2)
      return `${otherUsers[0].userName} et ${otherUsers[1].userName} sont en train d'écrire...`;
    return `${otherUsers.length} personnes sont en train d'écrire...`;
  }, [typingUsers, userId]);

  return {
    sendTypingIndicator,
    typingUsers,
    getTypingMessage,
  };
}
