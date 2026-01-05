import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // 1. 鉴权
  const session = await auth();
  // @ts-ignore
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // @ts-ignore
  const token = session.accessToken;
  const CASDOOR_API = process.env.NEXT_PUBLIC_CASDOOR_SERVER_URL || "";
  // ⚠️ 这里需要填入你的应用名称，用于 Casdoor 存储路径分类
  const APP_NAME = process.env.NEXT_PUBLIC_CASDOOR_APP_NAME || "";

  try {
    // 2. 从前端请求中获取文件数据 (FormData)
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 3. 获取当前用户信息，以便构建存储路径 (我们需要 owner 信息)
    const getUserRes = await fetch(`${CASDOOR_API}/api/get-account?accessToken=${token}`);
    const getUserJson = await getUserRes.json();
    if (getUserJson.status !== 'ok') throw new Error("Failed to get user info for upload");
    const userOwner = getUserJson.data.owner;

    // 4. 构造发往 Casdoor 的请求
    // Casdoor 上传接口需要的查询参数
    const params = new URLSearchParams({
        owner: userOwner,
        application: APP_NAME,
        tag: 'avatar', // 标记为头像
        parent: '',
        fullFilePath: `avatar/${file.name}-${Date.now()}`, // 生成唯一文件名防止冲突
        accessToken: token, // 必须带上 Token
    });

    // 构造新的 FormData 发给 Casdoor
    const casdoorFormData = new FormData();
    casdoorFormData.append("file", file);

    //console.log(`[Upload API] Proxying to Casdoor: ${CASDOOR_API}/api/upload-resource?${params.toString()}`);

    const uploadRes = await fetch(`${CASDOOR_API}/api/upload-resource?${params.toString()}`, {
        method: "POST",
        // ⚠️ 注意：使用 fetch 发送 FormData 时，千万不要手动设置 Content-Type header，
        // 浏览器/Node环境会自动生成正确的 boundary。
        body: casdoorFormData,
    });

    const uploadResult = await uploadRes.json();

    if (uploadResult.status !== "ok") {
      console.error("[Upload API] Casdoor Error:", uploadResult.msg);
      throw new Error(uploadResult.msg);
    }

    // Casdoor 返回的 data 字段就是完整的图片 URL
    const newAvatarUrl = uploadResult.data;
    console.log("[Upload API] Success. New URL:", newAvatarUrl);

    return NextResponse.json({ url: newAvatarUrl });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}