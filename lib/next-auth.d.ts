// 文件位置：/lib/next-auth.d.ts
// 新增：NextAuth (Auth.js) 类型扩展文件
// 用于声明通过 Casdoor OAuth 集成后，Session 和 User 对象新增的字段

import "next-auth";
import { UserType } from "@/app/(auth)/auth"; // 从原 auth.ts 导入用户类型定义

// 扩展 NextAuth 的默认模块类型
declare module "next-auth" {
  /**
   * 扩展 Session 对象类型，使其包含我们自定义的字段
   * 这些字段将在 `/app/(auth)/auth.ts` 的 `callbacks.session` 中返回
   */
  interface Session {
    user: {
      id: string;           // 来自 Casdoor 的用户唯一标识
      type: UserType;       // 用户类型（集成后固定为 ‘regular‘）
      role?: string;        // 新增：从 Casdoor 映射的角色字段（可选）
    } & DefaultSession["user"]; // 保留默认的 name, email, image 等字段
  }

  /**
   * 扩展 User 模型类型（对应数据库中的用户记录）
   * 这些字段将在 `/app/(auth)/auth.ts` 的 `profile` 回调中构建
   */
  interface User {
    id: string;
    type: UserType;
    role?: string;
  }
}

// 扩展 JWT Token 的类型，用于在会话回调中传递信息
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    type: UserType;
    role?: string;
  }
}