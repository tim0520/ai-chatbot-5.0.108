import { auth } from "@/app/(auth)/auth"; 
import { redirect } from 'next/navigation';
import { Profile } from '@/components/profile'; // ✅ 导入改名后的组件

export const metadata = {
  title: 'Profile Settings',
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-10">
      <Profile user={session.user} /> {/* ✅ 使用新组件名 */}
    </div>
  );
}