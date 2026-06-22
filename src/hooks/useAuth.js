import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

async function fetchAuthorProfile(authUser) {
  if (!authUser) return null;
  const { data } = await supabase
    .from("authors")
    .select("display_name, role")
    .eq("email", authUser.email)
    .single();
  return { ...authUser, displayName: data?.display_name || authUser.email, role: data?.role || "author" };
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (authUser) => {
    if (!authUser) { setUser(null); return; }
    const enriched = await fetchAuthorProfile(authUser);
    setUser(enriched);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await loadUser(session?.user || null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  };

  const signOut = () => supabase.auth.signOut();

  const changePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return { user, loading, signIn, signUp, signOut, changePassword };
}
