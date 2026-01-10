import { NextResponse } from "next/server";
import { signIn } from "@/app/(auth)/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // 1. 获取目标地址
  const rawRedirectUrl = searchParams.get("redirectUrl");
  let redirectUrl = rawRedirectUrl ? decodeURIComponent(rawRedirectUrl) : "/";

  console.log("========================================");
  console.log("🚀 [Guest API] Triggered");
  console.log("📥 [Guest API] Raw Params:", rawRedirectUrl);

  // =========================================================
  // 🛠️ 修复核心：强制修正 localhost 为公网 IP
  // =========================================================
  // 优先读取环境变量，如果没有读到，就用你现在的公网 IP 做兜底
  const publicBaseUrl = process.env.AUTH_URL || "http://47.117.47.58:3005";
  
  // 检查：如果目标地址包含 localhost，或者只是个根路径 "/"
  if (redirectUrl.includes("localhost") || redirectUrl === "/") {
    try {
      if (redirectUrl.startsWith("http")) {
        // 如果是完整 URL (如 http://localhost:3005/chat/xxx)
        // 我们只替换 协议(http)、域名(localhost) 和 端口(3005)
        const targetObj = new URL(redirectUrl);
        const publicObj = new URL(publicBaseUrl);
        
        targetObj.protocol = publicObj.protocol;
        targetObj.host = publicObj.host; // host 包含了 hostname 和 port
        
        redirectUrl = targetObj.toString();
      } else {
        // 如果是相对路径 (如 /chat/xxx)，直接拼接在公网 IP 后面
        // 确保没有双重斜杠 //
        const cleanPath = redirectUrl.startsWith("/") ? redirectUrl : `/${redirectUrl}`;
        redirectUrl = `${publicBaseUrl}${cleanPath}`;
      }
      console.log(`🛠️ [Guest API] Fixed localhost -> Public IP: ${redirectUrl}`);
    } catch (e) {
      // 万一解析出错，直接回首页兜底
      redirectUrl = publicBaseUrl;
      console.error("⚠️ [Guest API] URL fix failed, fallback to root:", e);
    }
  }
  // =========================================================

  console.log("🎯 [Guest API] Final Target:", redirectUrl);

  try {
    // 2. 执行登录
    await signIn("guest", { 
      redirect: false 
    });
    console.log("✅ [Guest API] SignIn success.");
  } catch (error) {
    // 忽略 NextAuth 的重定向错误干扰
    console.log("⚠️ [Guest API] SignIn signal (normal):", error);
  }

  // 3. 手动强制跳转到我们修正后的地址
  console.log("✈️ [Guest API] Redirecting to:", redirectUrl);
  console.log("========================================");
  
  return NextResponse.redirect(redirectUrl);
}