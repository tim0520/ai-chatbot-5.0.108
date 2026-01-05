import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/app/(auth)/auth";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <ChatPage params={props.params} />
    </Suspense>
  );
}

async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // ✅ 核心修改：增加 try/catch 包裹
  // 即使 queries.ts 抛出异常，这里也能接住，避免 500 页面
  let chat;
  try {
    chat = await getChatById({ id });
  } catch (e) {
    console.warn(`[ChatPage] Failed to load chat ${id}:`, e);
    // 如果数据库报错，直接视为找不到，跳转回首页或 404
    // 配合 redirect("/") 使用，用户会被带回首页
  }

  // 如果找不到聊天（或 ID 格式错误导致 queries 返回 null），回首页
  if (!chat) {
    redirect("/");
  }

  const session = await auth();

  // 如果没有 Session，去生成游客身份
  if (!session) {
    redirect("/api/auth/guest"); 
  }

  // 权限校验
  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");
  
  const isGuest = session.user?.type === "guest";

  if (!chatModelFromCookie) {
    return (
      <>
        <Chat
          autoResume={true}
          id={chat.id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility}
          isReadonly={session?.user?.id !== chat.userId}
          isGuest={isGuest}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={chat.id}
        initialChatModel={chatModelFromCookie.value}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId}
        isGuest={isGuest}
      />
      <DataStreamHandler />
    </>
  );
}