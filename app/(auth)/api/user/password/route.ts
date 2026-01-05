import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  
  // @ts-ignore
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // @ts-ignore
  const token = session.accessToken;
  const CASDOOR_API = process.env.NEXT_PUBLIC_CASDOOR_SERVER_URL || "";
  const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;
  const CLIENT_SECRET = process.env.CASDOOR_CLIENT_SECRET;

  try {
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Missing password fields" }, { status: 400 });
    }

    // 1. 获取当前用户信息 (为了拿到 owner 和 name)
    const getUserRes = await fetch(`${CASDOOR_API}/api/get-account?accessToken=${token}`);
    const getUserJson = await getUserRes.json();
    if (getUserJson.status !== 'ok') throw new Error("Failed to get user info");
    
    const user = getUserJson.data;

    // 2. 🛡️ 安全验证：尝试用旧密码登录一次，验证旧密码是否正确
    // 我们模拟一次 Token 获取请求
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("client_id", CLIENT_ID!);
    params.append("client_secret", CLIENT_SECRET!);
    params.append("username", user.name); // Casdoor 用户名
    params.append("password", oldPassword);
    params.append("owner", user.owner); // 显式指定 owner 比较稳妥
    params.append("scope", "openid profile");

    const checkRes = await fetch(`${CASDOOR_API}/api/login/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const checkData = await checkRes.json();

    // 如果拿不到 Token，说明旧密码错误
    if (checkData.error) {
      return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
    }

    // 3. 验证通过，执行修改密码
    // 我们复用 update-user 接口，只更新 password 字段
    const userId = `${user.owner}/${user.name}`;
    const updatedUser = {
      ...user,
      password: newPassword, // 设置新密码
    };

    const updateRes = await fetch(`${CASDOOR_API}/api/update-user?id=${userId}&accessToken=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedUser),
    });

    const updateJson = await updateRes.json();

    if (updateJson.status !== "ok") {
      throw new Error(updateJson.msg);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: error.message || "Failed to change password" }, { status: 500 });
  }
}