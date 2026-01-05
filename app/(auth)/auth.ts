import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/queries";
import { accounts, sessions, verificationTokens, user } from "@/lib/db/schema";
import { randomUUID } from "crypto";

export type UserType = "guest" | "regular";

// =========================================================
// 1. 类型扩展
// =========================================================
declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
      type: UserType;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    role?: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    role?: string;
    accessToken?: string;
  }
}

// =========================================================
// 2. 环境变量
// =========================================================
const getEnv = (key: string) => process.env[key] || "";
const CONNECTION_URL = getEnv("NEXT_PUBLIC_CASDOOR_SERVER_URL") || "";
const CLIENT_ID = getEnv("NEXT_PUBLIC_CLIENT_ID");
const CLIENT_SECRET = getEnv("CASDOOR_CLIENT_SECRET");
const ORG_NAME = getEnv("NEXT_PUBLIC_CASDOOR_ORGANIZATION_NAME");
const APP_NAME = getEnv("NEXT_PUBLIC_CASDOOR_APP_NAME");


// =========================================================
// 3. Casdoor OAuth Provider (标准 OAuth 模式)
// =========================================================
const casdoorProvider = {
  id: "casdoor", // 去掉 as const，让 TS 自动推断字符串
  name: "Casdoor",
  type: "oauth" as const, // 这里必须是 const，因为 type 是固定的字面量
  issuer: getEnv("NEXT_PUBLIC_ISSUER_ID") || "",
  authorization: `${CONNECTION_URL}/login/oauth/authorize?scope=openid+profile+email`,
  token: `${CONNECTION_URL}/api/login/oauth/access_token`,
  userinfo: {
    url: `${CONNECTION_URL}/api/userinfo`,
    async request({ tokens }: { tokens: any }) {
      const response = await fetch(`${CONNECTION_URL}/api/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      return await response.json();
    },
  },
  jwks_endpoint: `${CONNECTION_URL}/api/certs`,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  
  // 🚨 修复点：去掉了 as const，解决了 readonly 数组赋值给 mutable 数组的报错
  checks: ["pkce"], 
  
  httpOptions: { timeout: 10000 },
  async profile(profile: any) {
    return {
      id: profile.sub || profile.id,
      name: profile.name || profile.displayName,
      email: profile.email,
      image: profile.avatar,
      type: "regular" as const,
      role: profile.tag || "user",
    };
  },
};

// =========================================================
// 4. NextAuth 配置主体
// =========================================================
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  providers: [
    // @ts-ignore: 忽略某些细微的类型推断差异，主要配置已修正
    casdoorProvider,

    Credentials({
      id: "casdoor-credentials",
      name: "Casdoor Credentials",
      credentials: {
        username: { label: "Username/Phone", type: "text" },
        password: { label: "Password/Code", type: "password" },
        loginType: { label: "Type", type: "text" }, 
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const { username, password, loginType } = credentials;
        let accessToken = "";
        let verifiedUserId = ""; 

        try {
          console.log(`[Auth] Starting ${loginType} login for ${username}`);

          // =================================================================
          // 🔵 场景 A: 手机验证码登录 (Client Credentials 流程)
          // =================================================================
          if (loginType === "code") {
            // 1. 验证身份 (不获取 Token，只拿 UserID)
            const signinPayload = {
              application: APP_NAME, 
              organization: ORG_NAME,
              username: username,
              code: password, 
              signinMethod: "Verification code",
              type: "login", 
              autoSignin: true 
            };

            const verifyRes = await fetch(`${CONNECTION_URL}/api/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(signinPayload),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.status !== "ok") {
              console.error("[Auth] Code Verify Failed:", verifyData.msg);
              return null;
            }

            // data 格式通常为 "Organization/Username"
            verifiedUserId = verifyData.data; 
            console.log(`[Auth] Identity verified. ID: ${verifiedUserId}`);

            // 2. 申请 App 级 Access Token
            const tokenParams = new URLSearchParams();
            tokenParams.append("grant_type", "client_credentials");
            tokenParams.append("client_id", CLIENT_ID);
            tokenParams.append("client_secret", CLIENT_SECRET);
            tokenParams.append("scope", "openid profile email");

            const tokenRes = await fetch(`${CONNECTION_URL}/api/login/oauth/access_token`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: tokenParams,
            });
            const tokenData = await tokenRes.json();
            
            if (tokenData.error) {
               console.error("[Auth] Failed to get App Token:", tokenData.error);
               return null;
            }

            accessToken = tokenData.access_token; 
          } 
          // =================================================================
          // 🔵 场景 B: 密码登录 (Resource Owner Password 流程)
          // =================================================================
          else {
            const params = new URLSearchParams();
            params.append("client_id", CLIENT_ID);
            params.append("client_secret", CLIENT_SECRET);
            params.append("scope", "openid profile email");
            params.append("grant_type", "password");
            params.append("username", username as string);
            params.append("password", password as string);

            const res = await fetch(`${CONNECTION_URL}/api/login/oauth/access_token`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params,
            });
            const data = await res.json();
            if (data.error) return null;
            accessToken = data.access_token;
          }

          if (!accessToken) return null;

          // =================================================================
          // 🔵 步骤 3. 查户口 (获取用户信息)
          // =================================================================
          const targetId = verifiedUserId || `${ORG_NAME}/${username}`;

          const queryParams = new URLSearchParams({
            id: targetId,
            owner: ORG_NAME,
            accessToken: accessToken, 
          });
          
          if (/^\d{11}$/.test(username as string)) queryParams.append("phone", username as string);

          const fetchUrl = `${CONNECTION_URL}/api/get-user?${queryParams.toString()}`;
          console.log(`[Auth] Fetching profile via: ${fetchUrl}`);

          const userRes = await fetch(fetchUrl);
          const jsonResponse = await userRes.json();

          if (jsonResponse.status !== "ok" || !jsonResponse.data) {
             console.error("[Auth] Get User Failed:", jsonResponse.msg);
             return null;
          }

          const profile = jsonResponse.data;
          console.log("[Auth] Success! Logged in as:", profile.name);

          try {
            // 1. 检查数据库里有没有这个用户
            // 以前的写法 (报错): const existingUser = await db.query.user.findFirst(...)
            // 现在的写法 (稳健):
            const existingUser = await db
              .select()
              .from(user)
              .where(eq(user.id, profile.id))
              .limit(1)
              .then((res) => res[0]);

            // 准备数据
            const userDataToSave = {
              id: profile.id,
              name: profile.name || profile.displayName || profile.phone,
              email: profile.email,
              emailVerified: profile.emailVerified ? new Date() : null,
              image: profile.avatar,
            };

            if (!existingUser) {
              // A. 如果不存在，插入新用户
              console.log(`[Auth] Sync: Creating new user in DB: ${profile.id}`);
              await db.insert(user).values(userDataToSave);
            } else {
              // B. 如果存在，更新用户信息
              console.log(`[Auth] Sync: Updating existing user in DB: ${profile.id}`);
              await db.update(user)
                .set(userDataToSave)
                .where(eq(user.id, profile.id));
            }
          } catch (dbError) {
            console.error("❌ [Auth] Failed to sync user to database:", dbError);
          }

          return {
            id: profile.id, 
            name: profile.name || profile.displayName || profile.phone,
            email: profile.email,
            image: profile.avatar, 
            type: "regular",
            role: profile.tag || profile.role || "user",
            accessToken: accessToken, 
          };

        } catch (error) {
          console.error("[Auth] Error:", error);
          return null;
        }
      },
    }),
    Credentials({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() { return { id: randomUUID(), name: "Guest", type: "guest" } }
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.type = user.type;
        token.role = user.role;
        if (user.accessToken) token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
        session.user.role = token.role as string;
        if (token.accessToken) session.accessToken = token.accessToken;
      }
      return session;
    },
  },
});