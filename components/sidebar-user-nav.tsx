'use client';

import { ChevronUp, LogIn, LogOut, User as UserIcon } from 'lucide-react'; // ✅ 引入 LogIn
import { signOut } from 'next-auth/react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SidebarUserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    type?: string; // ✅ 确保包含 type 字段
  };
}

export function SidebarUserNav({ user }: SidebarUserNavProps) {
  // 1. 判断是否为游客
  // @ts-ignore
  const isGuest = user.type === 'guest';

  // 2. 处理游客登录 (先登出当前临时 Session，再跳登录页)
  const handleSignIn = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-12 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image || ''} alt={user.name || ''} />
                {/* 游客显示 G，普通用户显示首字母 */}
                <AvatarFallback className="rounded-lg">
                  {isGuest ? 'G' : user.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {user.name || 'User'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {/* ✅ 游客模式下，隐藏乱码邮箱，显示友好提示 */}
                  {isGuest ? 'Guest Mode' : user.email}
                </span>
              </div>
              <ChevronUp className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="top"
            align="end"
            sideOffset={4}
          >
            {/* 顶部用户信息展示 */}
            <div className="flex items-center gap-2 p-2">
               <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image || ''} alt={user.name || ''} />
                <AvatarFallback className="rounded-lg">
                   {isGuest ? 'G' : user.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                   {user.name || 'User'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                   {isGuest ? 'Guest Mode' : user.email}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator />
            
            {/* 菜单项 */}
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            
            {/* 可以在这里加 Billing 等，但如果是游客可以选择隐藏 */}
            {!isGuest && (
               // 这里放只有正式用户才能看到的菜单
               // <DropdownMenuItem>Billing</DropdownMenuItem>
               null
            )}

            <DropdownMenuSeparator />

            {/* ✅ 核心逻辑：Guest 显示 Sign In，Regular 显示 Log Out */}
            {isGuest ? (
              <DropdownMenuItem onClick={handleSignIn} className="cursor-pointer">
                <LogIn className="mr-2 h-4 w-4" />
                <span>Sign In / Register</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            )}
            
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}