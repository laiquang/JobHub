
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Search,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Building,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

import { useCompanies } from "@/hooks/useCompanies";
import { useProvinces } from "@/hooks/useProvinces";
import { useAuth } from "@/contexts/AuthContext";
import { FollowCompanyButton } from "@/components/FollowCompanyButton";

import type { Company } from "@/types";

// Quy mô công ty
const companySizes = [
  {
    id: "1-9",
    label: "1 - 9 nhân viên",
    backendValue: "1-9 nhân viên",
  },
  {
    id: "10-24",
    label: "10 - 24 nhân viên",
    backendValue: "10-24 nhân viên",
  },
  {
    id: "25-99",
    label: "25 - 99 nhân viên",
    backendValue: "25-99 nhân viên",
  },
  {
    id: "100-499",
    label: "100 - 499 nhân viên",
    backendValue: "100-499 nhân viên",
  },
  {
    id: "500-1000",
    label: "500 - 1000 nhân viên",
    backendValue: "500-1000 nhân viên",
  },
  {
    id: "1000+",
    label: "1000+ nhân viên",
    backendValue: "1000+ nhân viên",
  },
  {
    id: "3000+",
    label: "3000+ nhân viên",
    backendValue: "3000+ nhân viên",
  },
  {
    id: "5000+",
    label: "5000+ nhân viên",
    backendValue: "5000+ nhân viên",
  },
  {
    id: "10000+",
    label: "10000+ nhân viên",
    backendValue: "10000+ nhân viên",
  },
];

// URL ảnh đại diện công ty
const getAvatarUrl = (
  avatarPic?: string | null
): string | null => {
  if (!avatarPic) {
    return null;
  }

  if (
    avatarPic.startsWith("http://") ||
    avatarPic.startsWith("https://")
  ) {
    return avatarPic;
  }

  return `/api/uploads/${avatarPic}`;
};

export default function CompaniesPage() {
  const router = useRouter();

  const {
    userType,
    isAuthenticated,
    company: currentCompany,
  } = useAuth();

  // Tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] =
    useState("");

  // Bộ lọc
  const [
    selectedProvinces,
    setSelectedProvinces,
  ] = useState<string[]>([]);

  const [
    selectedSizes,
    setSelectedSizes,
  ] = useState<string[]>([]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);

  const companiesPerPage = 6;

  // Quy mô được chọn
  const selectedSize = companySizes.find(
    (size) => size.id === selectedSizes[0]
  );

  const backendScaleValue =
    selectedSize?.backendValue;

  // Tham số tìm kiếm gửi backend
  const searchParams = {
    page: currentPage,
    limit: companiesPerPage,

    ...(activeSearchTerm && {
      keyword: activeSearchTerm,
    }),

    ...(selectedProvinces.length > 0 && {
      province: Number(selectedProvinces[0]),
    }),

    ...(backendScaleValue && {
      scale: backendScaleValue,
    }),
  };

  // Lấy dữ liệu công ty
  const {
    data: companiesResponse,
    isLoading: isLoadingCompanies,
  } = useCompanies(searchParams);

  // Lấy danh sách tỉnh thành
  const {
    data: provincesResponse,
    isLoading: isLoadingProvinces,
  } = useProvinces();

  // Sử dụng kiểu Company chung của dự án
  const companies: Company[] =
    companiesResponse?.data ?? [];

  const totalCompanies =
    companiesResponse?.total ?? 0;

  const totalPages = Math.ceil(
    totalCompanies / companiesPerPage
  );

  const provinces =
    provincesResponse?.data ?? [];

  // Tìm kiếm công ty
  const handleSearch = () => {
    setActiveSearchTerm(searchTerm.trim());
    setCurrentPage(1);
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // Lọc theo tỉnh thành
  const handleProvinceChange = (
    provinceId: string,
    checked: boolean
  ) => {
    setSelectedProvinces(
      checked ? [provinceId] : []
    );

    setCurrentPage(1);
  };

  // Lọc theo quy mô
  const handleSizeChange = (
    sizeId: string,
    checked: boolean
  ) => {
    setSelectedSizes(
      checked ? [sizeId] : []
    );

    setCurrentPage(1);
  };

  // Điều hướng đến chi tiết công ty
  const handleCompanyClick = (
    companyId: number
  ) => {
    if (
      isAuthenticated &&
      userType === "company" &&
      currentCompany?.id === companyId
    ) {
      router.push("/company/profile");
    } else {
      router.push(`/companies/${companyId}`);
    }
  };

  // Xác định các số trang cần hiển thị
  const getVisiblePages = (): number[] => {
    if (totalPages <= 0) {
      return [];
    }

    const count = Math.min(5, totalPages);

    let startPage = Math.max(
      1,
      currentPage - 2
    );

    if (startPage + count - 1 > totalPages) {
      startPage = Math.max(
        1,
        totalPages - count + 1
      );
    }

    return Array.from(
      { length: count },
      (_, index) => startPage + index
    );
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Thanh tiêu đề và tìm kiếm */}
      <section className="border-b border-gray-200 bg-white px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Nhà tuyển dụng hàng đầu
            </h1>

            <div className="flex w-full max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                <Input
                  type="text"
                  placeholder="Tìm công ty"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  className="rounded-r-none border-gray-300 pl-10 pr-4"
                />
              </div>

              <Button
                type="button"
                onClick={handleSearch}
                className="rounded-l-none bg-primary px-6 text-white hover:bg-primary/90"
              >
                Tìm
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Bộ lọc */}
          <aside className="w-full space-y-6 lg:w-80">
            {/* Lọc tỉnh thành */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-4 font-semibold text-gray-900">
                Địa chỉ
              </h2>

              {isLoadingProvinces ? (
                <div className="space-y-3">
                  {Array.from({
                    length: 5,
                  }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-6 w-full"
                    />
                  ))}
                </div>
              ) : (
                <div className="max-h-60 space-y-3 overflow-y-auto">
                  {provinces.map((province) => (
                    <div
                      key={province.id}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={`province-${province.id}`}
                        checked={selectedProvinces.includes(
                          String(province.id)
                        )}
                        onCheckedChange={(checked) =>
                          handleProvinceChange(
                            String(province.id),
                            checked === true
                          )
                        }
                      />

                      <label
                        htmlFor={`province-${province.id}`}
                        className="flex-1 cursor-pointer text-sm text-gray-700"
                      >
                        {province.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lọc quy mô */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="mb-4 font-semibold text-gray-900">
                Quy mô
              </h2>

              <div className="space-y-3">
                {companySizes.map((size) => (
                  <div
                    key={size.id}
                    className="flex items-center space-x-3"
                  >
                    <Checkbox
                      id={`size-${size.id}`}
                      checked={selectedSizes.includes(
                        size.id
                      )}
                      onCheckedChange={(checked) =>
                        handleSizeChange(
                          size.id,
                          checked === true
                        )
                      }
                    />

                    <label
                      htmlFor={`size-${size.id}`}
                      className="flex-1 cursor-pointer text-sm text-gray-700"
                    >
                      {size.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Danh sách công ty */}
          <section className="min-w-0 flex-1">
            {!isLoadingCompanies && (
              <div className="mb-6">
                <p className="text-gray-600">
                  Tìm thấy{" "}
                  <span className="font-semibold">
                    {totalCompanies}
                  </span>{" "}
                  công ty

                  {activeSearchTerm && (
                    <span>
                      {" "}cho từ khóa "
                      <span className="font-semibold">
                        {activeSearchTerm}
                      </span>
                      "
                    </span>
                  )}

                  {backendScaleValue && (
                    <span>
                      {" "}với quy mô "
                      <span className="font-semibold">
                        {backendScaleValue}
                      </span>
                      "
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Loading */}
            {isLoadingCompanies ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="mb-4 flex justify-center">
                        <Skeleton className="h-24 w-24 rounded-lg" />
                      </div>

                      <div className="space-y-2 text-center">
                        <Skeleton className="mx-auto h-6 w-32" />
                        <Skeleton className="mx-auto h-4 w-24" />
                        <Skeleton className="mx-auto h-4 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : companies.length === 0 ? (
              /* Không có dữ liệu */
              <div className="py-12 text-center">
                <Building className="mx-auto mb-4 h-12 w-12 text-gray-400" />

                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  Không tìm thấy công ty
                </h3>

                <p className="text-gray-500">
                  Thử thay đổi bộ lọc hoặc từ khóa
                  tìm kiếm.
                </p>
              </div>
            ) : (
              /* Danh sách công ty */
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {companies.map((company) => {
                  const logoUrl = getAvatarUrl(
                    company.avatarPic
                  );

                  return (
                    <Card
                      key={company.id}
                      className="group cursor-pointer border border-border bg-card transition-shadow hover:shadow-lg"
                      onClick={() =>
                        handleCompanyClick(
                          company.id
                        )
                      }
                    >
                      <CardContent className="p-6">
                        {/* Nút theo dõi */}
                        <div
                          className="mb-4 flex justify-end"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <FollowCompanyButton
                            companyId={company.id}
                          />
                        </div>

                        {/* Logo */}
                        <div className="mb-6 flex justify-center">
                          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-white shadow-sm">
                            {logoUrl ? (
                              <Image
                                src={logoUrl}
                                alt={`${company.nameCompany} logo`}
                                fill
                                unoptimized
                                className="rounded-lg object-contain p-2"
                              />
                            ) : (
                              <Building className="h-8 w-8 text-primary/60" />
                            )}
                          </div>
                        </div>

                        {/* Thông tin công ty */}
                        <div className="space-y-2 text-center">
                          <h3 className="font-semibold text-foreground">
                            {company.nameCompany}
                          </h3>

                          <div className="flex items-center justify-center text-sm text-muted-foreground">
                            <MapPin className="mr-2 h-4 w-4 shrink-0" />

                            <span>
                              {company.provinceName ||
                                company.provinceFullName ||
                                "Chưa cập nhật"}
                            </span>
                          </div>

                          <div className="text-sm font-medium text-purple-600">
                            {company.jobCount ?? 0} việc làm
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Phân trang */}
            {!isLoadingCompanies &&
              totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(1, page - 1)
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {getVisiblePages().map(
                    (pageNum) => (
                      <Button
                        key={pageNum}
                        type="button"
                        variant={
                          currentPage === pageNum
                            ? "default"
                            : "outline"
                        }
                        size="icon"
                        onClick={() =>
                          setCurrentPage(pageNum)
                        }
                      >
                        {pageNum}
                      </Button>
                    )
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={
                      currentPage === totalPages
                    }
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(
                          totalPages,
                          page + 1
                        )
                      )
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
          </section>
        </div>
      </div>
    </main>
  );
}
