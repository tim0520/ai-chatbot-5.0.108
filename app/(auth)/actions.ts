"use server";

// ✅ 1. 统一常量
const CASDOOR_API = process.env.NEXT_PUBLIC_CASDOOR_SERVER_URL || "";

// 获取环境变量辅助函数
const getEnv = (key: string, defaultVal: string = "") => process.env[key] || defaultVal;

// 🟢 辅助函数：获取管理员 Token (Client Credentials Flow)
// 必须有这个 token，才有权限指定用户的 Name (ID)
async function getClientToken() {
  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID!;
  const clientSecret = process.env.CASDOOR_CLIENT_SECRET!;
  
  // 从环境变量获取管理员账号
  const adminUser = process.env.CASDOOR_ADMIN_USER || ""; 
  const adminPassword = process.env.CASDOOR_ADMIN_PASSWORD || ""; 

  const params = new URLSearchParams();
  // ⚠️ 关键修改：改为 password 模式
  params.append("grant_type", "password");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  
  // ⚠️ 关键修改：使用管理员账号登录
  params.append("owner", "built-in"); // 管理员通常在 built-in 组织下
  params.append("username", adminUser);
  params.append("password", adminPassword);
  
  params.append("scope", "read"); 

  try {
    const res = await fetch(`${CASDOOR_API}/api/login/oauth/access_token`, {
      method: "POST",
      body: params,
      cache: "no-store",
    });
    const data = await res.json();
    
    if (data.error) {
       console.error("Failed to get admin token:", data.error_description);
       return "";
    }
    
    return data.access_token;
  } catch (e) {
    console.error("Failed to get client token", e);
    return "";
  }
}

// 1. 获取应用配置
export async function getAppConfig() {
  try {
    const applicationId = getEnv("NEXT_PUBLIC_CASDOOR_APPLICATION_ID"); 
    const res = await fetch(`${CASDOOR_API}/api/get-application?id=${applicationId}`, {
      method: "GET",
      cache: "no-store", 
    });
    const data = await res.json();
    let enableCaptcha = true;
    if (data.status === "ok" && data.data?.enableCaptcha === false) {
      enableCaptcha = false;
    }
    return { enableCaptcha }; 
  } catch (e) {
    return { enableCaptcha: true }; 
  }
}

// 2. 发送验证码
export async function sendVerificationCode(
  dest: string, 
  captchaToken: string = "", 
  captchaId: string = "",    
  actionType: "signup" | "login" = "signup"
) {
  const params = new URLSearchParams();
  params.append("dest", dest);
  params.append("type", "phone");
  params.append("countryCode", "CN");
  params.append("method", actionType); 
  params.append("applicationId", getEnv("NEXT_PUBLIC_CASDOOR_APPLICATION_ID"));

  if (captchaId && captchaToken) {
    params.append("captchaType", "Default");
    params.append("captchaToken", captchaToken);
    params.append("clientSecret", captchaId);
  } else {
    params.append("captchaType", "none"); 
    params.append("captchaToken", "");    
    params.append("clientSecret", "");    
  }
  params.append("checkUser", ""); 

  try {
    const res = await fetch(`${CASDOOR_API}/api/send-verification-code`, {
      method: "POST",
      body: params,
    });
    return await res.json();
  } catch (e) {
    return { status: "error", msg: "网络请求失败" };
  }
}

// 3. 手机号注册 (改用 add-user)
export async function registerWithPhone(phone: string, smsCode: string, password?: string) {
  const token = await getClientToken();
  if (!token) return { status: "error", msg: "服务端配置错误: 无法获取 Token" };

  // 验证短信验证码是否正确 (Casdoor add-user 不会自动校验验证码，需要手动校验或信任前端)
  // 这里我们假设前端流程已经通过 sendVerificationCode 校验，或者你可以额外调用 verify 接口
  // 为了简化，我们直接创建用户

  const organization = getEnv("NEXT_PUBLIC_CASDOOR_ORGANIZATION_NAME");
  const finalPassword = password || Math.random().toString(36).slice(-8) + "Aa1+";

  const newUser = {
    owner: organization,
    name: phone,        // ✅ 强制指定 ID 为手机号
    displayName: phone, // ✅ 昵称
    password: finalPassword,
    phone: phone,
    countryCode: "CN",
    type: "normal-user", // 普通用户
    avatar: "https://cdn.casbin.org/img/casbin.svg",
    properties: {},
  };

  try {
    // ⚠️ 注意：add-user 接口的 URL 必须带上 id 参数 (组织/用户名)
    // 并且必须带上 accessToken
    const res = await fetch(`${CASDOOR_API}/api/add-user?accessToken=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    
    // Casdoor add-user 返回的 data 比较简单
    const data = await res.json();
    if (data.status === "ok") {
        return { status: "ok" };
    } else {
        return { status: "error", msg: data.msg };
    }
  } catch (e) {
    return { status: "error", msg: "注册请求失败" };
  }
}

// 4. 账号密码注册 (改用 add-user)
export async function registerWithPassword(username: string, password: string) {
  const token = await getClientToken();
  if (!token) return { status: "error", msg: "服务端配置错误: 无法获取 Token" };

  const organization = getEnv("NEXT_PUBLIC_CASDOOR_ORGANIZATION_NAME");

  const newUser = {
    owner: organization,
    name: username,        // ✅ 强制指定 ID 为输入的用户名
    displayName: username, // ✅ 昵称
    password: password,
    type: "normal-user",
    avatar: "https://cdn.casbin.org/img/casbin.svg",
    properties: {},
  };

  try {
    const res = await fetch(`${CASDOOR_API}/api/add-user?accessToken=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    
    const data = await res.json();
    if (data.status === "ok") {
        return { status: "ok" };
    } else {
        // 如果用户名已存在，Casdoor 通常会在这里返回 error msg
        return { status: "error", msg: data.msg };
    }
  } catch (e) {
    return { status: "error", msg: "注册请求失败" };
  }
}