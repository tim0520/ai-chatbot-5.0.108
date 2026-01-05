import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 健康检查放行
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // 2. ✅ 核心修复：放行 NextAuth API 和 Casdoor API (如验证码、资源文件)
  // 加上 || pathname.startsWith("/casdoor-api")
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/casdoor-api")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // ============================================================
  // 场景 A: 用户完全未登录 (无 Token)
  // ============================================================
  if (!token) {
    // 如果是去 登录、注册，直接放行
    if (["/login", "/register"].includes(pathname)) {
       return NextResponse.next();
    }

    // 强制生成 Guest 身份
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  // ============================================================
  // 场景 B: 用户已登录 (有 Token)
  // ============================================================
  
  // 判断是否为游客身份 (约定：游客邮箱以 guest- 开头)
  const isGuest = token.email?.startsWith("guest-");

  // 如果已登录用户试图访问 /login 或 /register
  if (["/login", "/register"].includes(pathname)) {
    // 允许游客访问 (因为游客需要去注册/登录来升级为正式用户)
    if (isGuest) {
       return NextResponse.next();
    }
    // 正式用户访问这些页面没意义，踢回首页
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 其他情况直接放行
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};