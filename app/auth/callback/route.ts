import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

function getSafeNextPath(nextParam: string | null) {
  if (!nextParam) {
    return "/";
  }

  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/";
  }

  return nextParam;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const googleCalendarConnect = requestUrl.searchParams.get("google_calendar") === "connect";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
  }

  const response = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth", requestUrl.origin));
  }

  if (googleCalendarConnect && data.session?.provider_token) {
    const profileResult = await supabase.from("profiles").select("id, role").eq("id", data.session.user.id).single();

    if (profileResult.data && ["admin", "coordenacao"].includes(profileResult.data.role ?? "")) {
      const googleIdentity = data.session.user.identities?.find((identity) => identity.provider === "google");
      await supabase.from("google_calendar_user_connections").upsert(
        {
          profile_id: data.session.user.id,
          provider: "google",
          provider_user_email: data.session.user.email ?? null,
          provider_user_id: googleIdentity?.id ?? null,
          access_token: data.session.provider_token,
          refresh_token: data.session.provider_refresh_token ?? null,
          access_token_expires_at: null,
          scopes: "openid email profile https://www.googleapis.com/auth/calendar.events",
        },
        { onConflict: "profile_id" }
      );
    }
  }

  return response;
}
