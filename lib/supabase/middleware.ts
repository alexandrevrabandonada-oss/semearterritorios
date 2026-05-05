import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTHORIZED_ROLES = ["admin", "coordenacao", "equipe"] as const;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/logout");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const hasAuthorizedProfile = !!profile?.role && AUTHORIZED_ROLES.includes(profile.role);

  if (!hasAuthorizedProfile && !pathname.startsWith("/aguardando-liberacao") && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/aguardando-liberacao";
    return NextResponse.redirect(url);
  }

  if (hasAuthorizedProfile && pathname.startsWith("/aguardando-liberacao")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = hasAuthorizedProfile ? "/" : "/aguardando-liberacao";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
