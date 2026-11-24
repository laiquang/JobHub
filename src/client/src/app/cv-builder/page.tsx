'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Lock,
  Sparkles,
  BriefcaseBusiness,
  Minus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/toast';

const templates = [
  {
    key: 'modern',
    name: 'Modern',
    description: 'Thiết kế hiện đại, nổi bật và phù hợp với nhiều ngành nghề.',
    icon: Sparkles,
  },
  {
    key: 'professional',
    name: 'Professional',
    description: 'Phong cách chuyên nghiệp, phù hợp với môi trường doanh nghiệp.',
    icon: BriefcaseBusiness,
  },
  {
    key: 'minimal',
    name: 'Minimal',
    description: 'Bố cục tối giản, tập trung vào nội dung và kinh nghiệm.',
    icon: Minus,
  },
];

export default function CVBuilderPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading,
    userType,
  } = useAuth();

  const hasShownToastRef = useRef(false);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    if (
      isLoading ||
      hasShownToastRef.current ||
      isRedirectingRef.current
    ) {
      return;
    }

    // Chưa đăng nhập
    if (!isAuthenticated) {
      hasShownToastRef.current = true;
      isRedirectingRef.current = true;

      showToast.warning(
        'Vui lòng đăng nhập để sử dụng CV Builder'
      );

      setTimeout(() => {
        router.push('/login');
      }, 100);

      return;
    }

    // Chỉ ứng viên được sử dụng
    if (userType !== 'user') {
      hasShownToastRef.current = true;
      isRedirectingRef.current = true;

      showToast.warning(
        'CV Builder chỉ dành cho tài khoản ứng viên'
      );

      setTimeout(() => {
        router.push('/');
      }, 100);
    }
  }, [
    isAuthenticated,
    isLoading,
    userType,
    router,
  ]);

  const handleSelectTemplate = (templateKey: string) => {
    router.push(
      `/cv-builder/editor?template=${templateKey}`
    );
  };

  // Loading authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />

          <p className="text-gray-600">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  // Không có quyền
  if (!isAuthenticated || userType !== 'user') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">

          <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Không thể truy cập CV Builder
          </h2>

          <p className="text-gray-600">
            Bạn cần đăng nhập bằng tài khoản ứng viên
            để sử dụng tính năng này.
          </p>

        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">

          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-7 h-7 text-primary" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Tạo CV chuyên nghiệp
          </h1>

          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Chọn mẫu CV phù hợp và bắt đầu xây dựng CV
            của bạn. Bạn có thể chỉnh sửa nội dung và
            xem trước CV trực tiếp.
          </p>

        </div>
      </section>

      {/* Template list */}
      <section className="max-w-7xl mx-auto px-4 py-10">

        <div className="mb-7">
          <h2 className="text-2xl font-bold text-gray-900">
            Chọn mẫu CV
          </h2>

          <p className="text-gray-500 mt-1">
            Bạn có thể thay đổi nội dung CV sau khi chọn mẫu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {templates.map((template) => {
            const Icon = template.icon;

            return (
              <Card
                key={template.key}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >

                {/* Preview giả lập */}
                <div className="bg-gray-100 p-6">

                  <div className="bg-white shadow-sm aspect-[210/297] max-h-[360px] mx-auto p-5">

                    {/* Name */}
                    <div className="flex items-center gap-3 border-b pb-4">

                      <div className="w-12 h-12 rounded-full bg-gray-200" />

                      <div className="flex-1">
                        <div className="h-3 bg-gray-800 rounded w-2/3 mb-2" />
                        <div className="h-2 bg-gray-300 rounded w-1/2" />
                      </div>

                    </div>

                    {/* Summary */}
                    <div className="mt-5">
                      <div className="h-2.5 bg-gray-700 rounded w-1/3 mb-3" />

                      <div className="space-y-2">
                        <div className="h-2 bg-gray-200 rounded w-full" />
                        <div className="h-2 bg-gray-200 rounded w-11/12" />
                        <div className="h-2 bg-gray-200 rounded w-4/5" />
                      </div>
                    </div>

                    {/* Experience */}
                    <div className="mt-6">
                      <div className="h-2.5 bg-gray-700 rounded w-2/5 mb-3" />

                      <div className="space-y-2">
                        <div className="h-2 bg-gray-200 rounded w-full" />
                        <div className="h-2 bg-gray-200 rounded w-5/6" />
                        <div className="h-2 bg-gray-200 rounded w-3/4" />
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="mt-6">
                      <div className="h-2.5 bg-gray-700 rounded w-1/4 mb-3" />

                      <div className="flex gap-2 flex-wrap">
                        <div className="h-5 w-12 bg-gray-200 rounded" />
                        <div className="h-5 w-16 bg-gray-200 rounded" />
                        <div className="h-5 w-14 bg-gray-200 rounded" />
                      </div>
                    </div>

                  </div>

                </div>

                <CardContent className="p-6">

                  <div className="flex items-center gap-2 mb-2">

                    <Icon className="w-5 h-5 text-primary" />

                    <h3 className="text-xl font-semibold">
                      {template.name}
                    </h3>

                  </div>

                  <p className="text-sm text-gray-600 min-h-[40px]">
                    {template.description}
                  </p>

                  <Button
                    className="w-full mt-5"
                    onClick={() =>
                      handleSelectTemplate(template.key)
                    }
                  >
                    Sử dụng mẫu
                  </Button>

                </CardContent>

              </Card>
            );
          })}

        </div>
      </section>
    </main>
  );
}