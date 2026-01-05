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

  try {
    const body = await req.json();

    // 1. 先获取旧信息
    // ✅ 这里带了 accessToken，所以是成功的
    const getUserRes = await fetch(`${CASDOOR_API}/api/get-account?accessToken=${token}`);
    const getUserJson = await getUserRes.json();
    
    if (getUserJson.status !== 'ok') {
       throw new Error("Failed to retrieve user info");
    }

    const currentUser = getUserJson.data;

    // 2. 构造更新数据
    const updatedUser = {
      ...currentUser,
      ...body, 
    };

    // 3. 提交更新
    // 构造 ID: 组织名/用户名
    const userId = `${currentUser.owner}/${currentUser.name}`;

    // 🔴 修正点：这里必须带上 accessToken 才能通过 Casdoor 的权限验证
    const updateRes = await fetch(
      `${CASDOOR_API}/api/update-user?id=${userId}&accessToken=${token}`, 
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      }
    );

    const updateJson = await updateRes.json();

    if (updateJson.status !== "ok") {
      // 这里的 msg 包含了 Casdoor 拒绝的具体原因（比如"邮箱已存在"等）
      console.error("[API] Casdoor Update Error:", updateJson.msg);
      throw new Error(updateJson.msg); 
    }

    return NextResponse.json({ success: true, data: updateJson.data });

  } catch (error: any) {
    console.error("Update user error:", error);
    // 返回具体的错误信息给前端，而不是笼统的 "Failed"
    return NextResponse.json(
      { error: error.message || "Failed to update profile" }, 
      { status: 500 }
    );
  }
}