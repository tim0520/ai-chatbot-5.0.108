import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";

export async function GET() {
  // 1. 获取本地 Session (这里面已经包含了我们在 auth.ts 里查到的完整用户信息)
  const session = await auth();

  // 2. 检查是否登录
  if (!session || !session.user) {
    console.error("❌ [API] No session found.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. ✅ 直接返回 Session 中的数据
  // 既然 auth.ts 已经验证通过并获取了 profile，我们就直接用它。
  // 避免再次调用 Casdoor 导致 "User doesn't exist" 的错误。
  
  const userData = {
    id: session.user.id,
    name: session.user.name, // 这通常是 姓名 或 手机号
    email: session.user.email,
    avatar: session.user.image, // Casdoor 的 avatar 字段映射到了 Session 的 image
    
    // 如果你需要兼容旧的前端字段 (例如 frontend 期待 'phone')
    // 我们可以根据 auth.ts 的逻辑，把 name 当作 phone 返回 (如果是手机号登录)
    phone: session.user.name, 
    
    // 补充一些元数据，防止前端报错
    displayName: session.user.name,
    role: session.user.role || "user",
  };

  // console.log("✅ [API] Returning session user data:", userData.name);

  return NextResponse.json(userData);
}