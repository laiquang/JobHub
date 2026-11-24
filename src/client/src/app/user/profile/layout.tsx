import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân - JobHub',
  description: 'Quản lý hồ sơ cá nhân và thông tin ứng viên trên JobHub',
};

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

