import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. 健康检查放行
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // 2. API 和 Casdoor 资源放行
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/casdoor-api")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: false,//!isDevelopmentEnvironment,
  });

  // ============================================================
  // 场景 A: 用户完全未登录 (无 Token)
  // ============================================================
  if (!token) {
    // 如果是去 登录、注册，直接放行
    if (["/login", "/register"].includes(pathname)) {
       return NextResponse.next();
    }

    // ---------------------------------------------------------
    // 🛠️ 核心修复：强制使用公网 IP 生成回调地址
    // ---------------------------------------------------------
    
    // 1. 定义你的公网入口 (硬编码最稳，防止环境变量读取失败)
    const PUBLIC_URL = "http://47.117.47.58:3005";
    
    // 2. 拼接用户原本想访问的完整路径 (例如 /chat/123?model=gpt4)
    // 这样我们构建出来的就是: http://47.117.47.58:3005/chat/123...
    const fullTargetUrl = `${PUBLIC_URL}${pathname}${search}`;

    // 3. 编码这个公网地址
    const redirectUrl = encodeURIComponent(fullTargetUrl);

    console.log(`🔒 [Proxy] Guest Login Redirect -> ${fullTargetUrl}`);

    // 4. 发送给 Guest API
    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  // ============================================================
  // 场景 B: 用户已登录 (有 Token)
  // ============================================================
  
  // 判断是否为游客身份
  const isGuest = token.email?.startsWith("guest-");

  // 如果已登录用户试图访问 /login 或 /register
  if (["/login", "/register"].includes(pathname)) {
    // 允许游客访问 (去升级账号)
    if (isGuest) {
       return NextResponse.next();
    }
    // 正式用户踢回首页
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