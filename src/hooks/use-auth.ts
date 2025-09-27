"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

export function useAuth() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar token da sessão do localStorage
  useEffect(() => {
    const token = localStorage.getItem('session_token');
    setSessionToken(token);
    setLoading(false);
  }, []);

  // Buscar dados do usuário baseado no token de sessão
  const currentUser = useQuery(
    api.users.getCurrentUser, 
    sessionToken ? { sessionToken } : "skip"
  );

  const signInMutation = useMutation(api.users.signIn);
  const signOutMutation = useMutation(api.users.signOut);

  const isLoggedIn = !!sessionToken && !!currentUser;
  const username = currentUser?.name;
  const role = currentUser?.role;

  return {
    isLoggedIn,
    username,
    role,
    user: currentUser,
    loading: loading || (sessionToken && currentUser === undefined),
    signIn: async (email: string, password: string) => {
      try {
        const result = await signInMutation({ email, password });
        if (result.success && result.sessionToken) {
          localStorage.setItem('session_token', result.sessionToken);
          setSessionToken(result.sessionToken);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },
    logout: async () => {
      try {
        if (sessionToken) {
          await signOutMutation({ sessionToken });
        }
        localStorage.removeItem('session_token');
        setSessionToken(null);
        return true;
      } catch (error) {
        console.error("Sign out error:", error);
        return false;
      }
    }
  };
}
