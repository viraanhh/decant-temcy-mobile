
import * as AuthSession from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export const signInWithGoogle = async () => {
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: "decanttemcy",
    path: "auth/callback",
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo
  );

  if (result.type !== "success") {
    throw new Error("Login Google dibatalkan");
  }

  const { params, errorCode } = QueryParams.getQueryParams(result.url);

  if (errorCode) throw new Error(errorCode);

  if (!params.code) {
    throw new Error("Authorization code tidak ditemukan");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.exchangeCodeForSession(params.code);

  if (sessionError) throw sessionError;

  return sessionData.session;
};