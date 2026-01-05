import { NextResponse } from "next/server";
import { signIn } from "@/app/(auth)/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // 1. 获取目标地址
  // decodeURIComponent 是为了保险，防止二次编码问题
  const rawRedirectUrl = searchParams.get("redirectUrl");
  const redirectUrl = rawRedirectUrl ? decodeURIComponent(rawRedirectUrl) : "/";

  console.log("========================================");
  console.log("🚀 [Guest API] Triggered");
  console.log("📥 [Guest API] Raw Params:", rawRedirectUrl);
  console.log("🎯 [Guest API] Target Redirect:", redirectUrl);

  try {
    // 2. 执行登录
    // redirect: false 告诉 NextAuth 不要抛出重定向错误，也不要自己跳转
    const result = await signIn("guest", { 
      redirect: false 
    });

    console.log("✅ [Guest API] SignIn success. Result:", result);

  } catch (error) {
    // 🚨 NextAuth 的 signIn 有时即使设置了 redirect: false 也会抛出一个 "DigestRedirect" 错误
    // 这是 Next.js 的机制。我们需要捕获它，但如果是重定向错误，我们可以忽略它或者利用它
    console.log("⚠️ [Guest API] SignIn threw an error (Expected if it's a redirect):", error);
  }

  // 3. 手动强制跳转
  // 无论 signIn 发生了什么，只要没崩掉，我们就强制跳到 redirectUrl
  console.log("✈️ [Guest API] Redirecting to:", redirectUrl);
  console.log("========================================");
  
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}