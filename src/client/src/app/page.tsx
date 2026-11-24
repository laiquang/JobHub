
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Users,
  Shield,
  Calculator,
  Building,
  HandCoins,
  TrendingUp,
  Package,
  Megaphone,
  Shirt,
  Target,
  MessageCircle,
  CheckCircle,
  Truck,
  Globe,
  Code,
  Stethoscope,
  Headphones,
  ArrowRight,
  Sparkles,
  BriefcaseBusiness,
  ChevronRight,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import { useCompanies } from "@/hooks/useCompanies";
import { useJobs } from "@/hooks/useJobs";
import { useProvinces } from "@/hooks/useProvinces";
import { useFields } from "@/hooks/useFields";
import { useAuth } from "@/contexts/AuthContext";
import { SavedJobButton } from "@/components/SavedJobButton";
import { FollowCompanyButton } from "@/components/FollowCompanyButton";
import { useApplicationStatus } from "@/hooks/useApplications";
import { showToast } from "@/utils/toast";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ==========================================
// DỮ LIỆU GIAO DIỆN
// ==========================================

const categorySlides = [
  [
    {
      icon: Users,
      title: "Dịch vụ khách hàng",
      color: "violet",
    },
    {
      icon: Building,
      title: "Giáo dục / Đào tạo / Thư viện",
      color: "blue",
    },
    {
      icon: Shield,
      title: "Bảo hiểm",
      color: "emerald",
    },
    {
      icon: Calculator,
      title: "Kế toán / Kiểm toán",
      color: "amber",
    },
    {
      icon: Building,
      title: "Ngân hàng / Chứng khoán",
      color: "pink",
    },
    {
      icon: HandCoins,
      title: "Tài chính / Đầu tư",
      color: "indigo",
    },
  ],
  [
    {
      icon: TrendingUp,
      title: "Bán hàng / Kinh doanh",
      color: "blue",
    },
    {
      icon: Package,
      title: "Hàng gia dụng",
      color: "amber",
    },
    {
      icon: Megaphone,
      title: "Quảng cáo / Đối ngoại",
      color: "pink",
    },
    {
      icon: Shirt,
      title: "Thời trang",
      color: "violet",
    },
    {
      icon: Target,
      title: "Tiếp thị",
      color: "emerald",
    },
    {
      icon: MessageCircle,
      title: "Tư vấn",
      color: "indigo",
    },
  ],
  [
    {
      icon: CheckCircle,
      title: "Quản lý chất lượng",
      color: "emerald",
    },
    {
      icon: Truck,
      title: "Vận chuyển / Giao hàng / Kho bãi",
      color: "amber",
    },
    {
      icon: Globe,
      title: "Xuất nhập khẩu / Ngoại thương",
      color: "blue",
    },
    {
      icon: Code,
      title: "CNTT - Phần mềm",
      color: "violet",
    },
    {
      icon: Stethoscope,
      title: "Chăm sóc sức khỏe / Y tế",
      color: "pink",
    },
    {
      icon: Headphones,
      title: "Dịch vụ khách hàng",
      color: "indigo",
    },
  ],
] as const;

const categoryColors = {
  violet: {
    icon: "bg-violet-100 text-violet-600",
    border: "hover:border-violet-300",
    glow: "group-hover:bg-violet-50",
  },
  blue: {
    icon: "bg-blue-100 text-blue-600",
    border: "hover:border-blue-300",
    glow: "group-hover:bg-blue-50",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600",
    border: "hover:border-emerald-300",
    glow: "group-hover:bg-emerald-50",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600",
    border: "hover:border-amber-300",
    glow: "group-hover:bg-amber-50",
  },
  pink: {
    icon: "bg-pink-100 text-pink-600",
    border: "hover:border-pink-300",
    glow: "group-hover:bg-pink-50",
  },
  indigo: {
    icon: "bg-indigo-100 text-indigo-600",
    border: "hover:border-indigo-300",
    glow: "group-hover:bg-indigo-50",
  },
};

const applicationSteps = [
  {
    step: "01",
    image: "/1.svg",
    title: "Tạo tài khoản",
    description:
      "Đăng ký tài khoản miễn phí để truy cập hàng ngàn cơ hội việc làm.",
    iconColor: "bg-violet-100 text-violet-700",
    borderColor: "hover:border-violet-200",
  },
  {
    step: "02",
    image: "/2.svg",
    title: "Cập nhật hồ sơ",
    description:
      "Hoàn thiện hồ sơ để tăng cơ hội được nhà tuyển dụng chú ý.",
    iconColor: "bg-blue-100 text-blue-700",
    borderColor: "hover:border-blue-200",
  },
  {
    step: "03",
    image: "/3.svg",
    title: "Ứng tuyển",
    description:
      "Tìm kiếm và ứng tuyển vào những vị trí phù hợp với bạn.",
    iconColor: "bg-emerald-100 text-emerald-700",
    borderColor: "hover:border-emerald-200",
  },
];

// ==========================================
// HELPERS
// ==========================================

const getLogoUrl = (logo?: string | null) => {
  if (!logo) return null;

  if (
    logo.startsWith("http://") ||
    logo.startsWith("https://")
  ) {
    return logo;
  }

  return `/api/uploads/${logo}`;
};

const getCompanyLogoFromJob = (job: any) => {
  return (
    job.company?.avatarPic ||
    job.avatarPic ||
    job.companyAvatar ||
    job.company_logo ||
    job.logo ||
    null
  );
};

const formatSalary = (min?: number, max?: number) => {
  if (!min && !max) return "Thỏa thuận";
  if (min && max) return `${min} - ${max} triệu`;
  if (min) return `Từ ${min} triệu`;
  if (max) return `Đến ${max} triệu`;

  return "Thỏa thuận";
};

// ==========================================
// APPLY BUTTON
// GIỮ NGUYÊN LOGIC ỨNG TUYỂN
// ==========================================

const ApplyButton: React.FC<{ jobId: number }> = ({
  jobId,
}) => {
  const router = useRouter();

  const {
    isAuthenticated,
    userType,
    isLoading: authLoading,
    refreshUser,
  } = useAuth();

  const {
    token,
    storedUserType,
    isActuallyAuthenticated,
    actualUserType,
  } = useMemo(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;

    const storedUserType =
      typeof window !== "undefined"
        ? localStorage.getItem("userType")
        : null;

    return {
      token,
      storedUserType,
      isActuallyAuthenticated:
        isAuthenticated || !!(token && storedUserType),
      actualUserType: userType || storedUserType,
    };
  }, [isAuthenticated, userType]);

  const shouldQueryStatus =
    !authLoading &&
    isActuallyAuthenticated &&
    actualUserType === "user";

  const {
    data: applicationStatus,
    isLoading: statusLoading,
  } = useApplicationStatus(jobId, shouldQueryStatus);

  useEffect(() => {
    if (
      !authLoading &&
      !isAuthenticated &&
      token &&
      storedUserType
    ) {
      refreshUser();
    }
  }, [
    authLoading,
    isAuthenticated,
    token,
    storedUserType,
    refreshUser,
  ]);

  if (authLoading) {
    return (
      <Button
        size="sm"
        disabled
        className="rounded-xl bg-slate-300"
      >
        Đang tải...
      </Button>
    );
  }

  const handleCompanyClick = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    showToast.warning(
      "Chỉ ứng viên mới có thể ứng tuyển"
    );
  };

  if (
    isActuallyAuthenticated &&
    actualUserType !== "user"
  ) {
    return (
      <Button
        size="sm"
        onClick={handleCompanyClick}
        className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
      >
        Ứng tuyển
      </Button>
    );
  }

  const handleApplyClick = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (statusLoading || authLoading) return;

    if (applicationStatus?.hasApplied === true) {
      showToast.info(
        "Bạn đã ứng tuyển công việc này rồi"
      );
      return;
    }

    if (!isActuallyAuthenticated) {
      showToast.warning(
        "Vui lòng đăng nhập để ứng tuyển"
      );
      return;
    }

    if (actualUserType !== "user") {
      showToast.warning(
        "Chỉ ứng viên mới có thể ứng tuyển"
      );
      return;
    }

    router.push(`/jobs/${jobId}?apply=true`);
  };

  return (
    <Button
      size="sm"
      onClick={handleApplyClick}
      disabled={
        statusLoading ||
        authLoading ||
        applicationStatus?.hasApplied
      }
      className={`rounded-xl px-4 font-semibold transition-all duration-300 motion-safe:hover:-translate-y-0.5 ${
        applicationStatus?.hasApplied
          ? "cursor-not-allowed bg-slate-400"
          : "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-200 hover:from-violet-700 hover:to-purple-700 hover:shadow-lg"
      }`}
    >
      {statusLoading
        ? "Đang kiểm tra..."
        : applicationStatus?.hasApplied
          ? "Đã ứng tuyển"
          : "Ứng tuyển"}
    </Button>
  );
};

// ==========================================
// HOME PAGE
// ==========================================

export default function Home() {
  const router = useRouter();

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const [searchKeyword, setSearchKeyword] =
    useState("");

  const [selectedLocation, setSelectedLocation] =
    useState("");

  const {
    userType,
    isAuthenticated,
    company,
  } = useAuth();

  const {
    data: companiesResponse,
    isLoading: isLoadingCompanies,
  } = useCompanies({
    page: 1,
    limit: 8,
  });

  const {
    data: jobsResponse,
    isLoading: isLoadingJobs,
  } = useJobs({
    page: 1,
    limit: 4,
  });

  const { data: provincesResponse } =
    useProvinces();

  const { data: fieldsResponse } =
    useFields();

  const provinces = provincesResponse?.data || [];
  const fields = fieldsResponse?.data || [];

  // ========================================
  // TÌM KIẾM
  // ========================================

  const handleSearch = () => {
    const searchParams = new URLSearchParams();

    if (searchKeyword.trim()) {
      searchParams.set(
        "q",
        searchKeyword.trim()
      );
    }

    if (
      selectedLocation &&
      selectedLocation !== "all"
    ) {
      searchParams.set(
        "location",
        selectedLocation
      );
    }

    const queryString =
      searchParams.toString();

    router.push(
      queryString
        ? `/search?${queryString}`
        : "/search"
    );
  };

  const handleKeyPress = (
    e: React.KeyboardEvent
  ) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleFieldSearch = (
    fieldName: string
  ) => {
    const field = fields?.find(
      (f) =>
        f.name
          .toLowerCase()
          .includes(fieldName.toLowerCase()) ||
        fieldName
          .toLowerCase()
          .includes(f.name.toLowerCase())
    );

    const searchParams = new URLSearchParams();

    if (field) {
      searchParams.set(
        "field",
        field.id.toString()
      );
    } else {
      searchParams.set("q", fieldName);
    }

    router.push(
      `/search?${searchParams.toString()}`
    );
  };

  const handleCompanyClick = (
    companyId: number
  ) => {
    if (
      isAuthenticated &&
      userType === "company" &&
      company?.id === companyId
    ) {
      router.push("/company/profile");
    } else {
      router.push(
        `/companies/${companyId}`
      );
    }
  };

  // ========================================
  // CAROUSEL
  // ========================================

  useEffect(() => {
    if (!api) return;

    const updateCarousel = () => {
      setCount(
        api.scrollSnapList().length
      );

      setCurrent(
        api.selectedScrollSnap() + 1
      );
    };

    updateCarousel();

    api.on("select", updateCarousel);
    api.on("reInit", updateCarousel);

    return () => {
      api.off("select", updateCarousel);
      api.off("reInit", updateCarousel);
    };
  }, [api]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      {/* ====================================
          1. HERO SECTION
          ==================================== */}

      <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-violet-50/70 to-blue-50/80 py-16 sm:py-20 lg:py-24">
        {/* Background decorations */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-12 h-80 w-80 rounded-full bg-violet-200/50 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-fuchsia-100/60 blur-3xl"
        />

        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-10">
            {/* Left content */}
            <div className="space-y-7 lg:pr-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/85 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                Khám phá cơ hội cùng JobHub
              </div>

              <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.22]">
                Khám phá tiềm năng nghề nghiệp cùng{" "}
                <span className="bg-gradient-to-r from-violet-700 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  JobHub
                </span>
                {" "}– Bước đầu cho sự nghiệp tươi sáng!
              </h1>

              <p className="max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                Tìm kiếm công việc mơ ước của bạn với
                hàng ngàn cơ hội việc làm từ các công ty
                hàng đầu. Chúng tôi kết nối tài năng
                với cơ hội.
              </p>

              {/* Partners */}
              <div className="flex flex-wrap items-center gap-3 py-2">
                <span className="mr-1 text-sm font-medium text-slate-500">
                  Đối tác của chúng tôi:
                </span>

                {[
                  {
                    name: "VNG",
                    color: "text-orange-600",
                  },
                  {
                    name: "GHTK",
                    color: "text-green-600",
                  },
                  {
                    name: "viettel",
                    color: "text-red-600",
                  },
                  {
                    name: "FPT",
                    color: "text-orange-600",
                  },
                ].map((partner) => (
                  <div
                    key={partner.name}
                    className="rounded-lg border border-white/80 bg-white/90 px-3 py-1.5 shadow-sm transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
                  >
                    <span
                      className={`font-bold ${partner.color}`}
                    >
                      {partner.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Search box */}
              <div className="relative max-w-2xl">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-300/40 via-fuchsia-200/40 to-blue-300/40 blur-lg"
                />

                <div className="relative rounded-2xl border border-violet-100 bg-white/95 p-4 shadow-xl shadow-violet-100/70 backdrop-blur sm:p-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />

                      <Input
                        placeholder="Nhập tên công việc..."
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pl-10 focus-visible:border-violet-400 focus-visible:ring-violet-200"
                        value={searchKeyword}
                        onChange={(e) =>
                          setSearchKeyword(
                            e.target.value
                          )
                        }
                        onKeyDown={handleKeyPress}
                      />
                    </div>

                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-violet-500" />

                      <Select
                        value={selectedLocation}
                        onValueChange={
                          setSelectedLocation
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/70 pl-10 focus:ring-violet-200">
                          <SelectValue placeholder="Chọn địa điểm..." />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="all">
                            Tất cả địa điểm
                          </SelectItem>

                          {(provinces || []).map(
                            (province) => (
                              <SelectItem
                                key={province.id}
                                value={province.id.toString()}
                              >
                                {province.nameWithType ||
                                  province.name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleSearch}
                      className="group h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 font-semibold text-white shadow-md shadow-violet-200 transition-all duration-300 hover:from-violet-700 hover:to-blue-600 hover:shadow-lg motion-safe:hover:-translate-y-0.5"
                    >
                      Tìm việc
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right illustration */}
            <div className="relative flex min-h-[300px] items-center justify-center sm:min-h-[360px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute h-72 w-72 rounded-full bg-gradient-to-br from-violet-200/70 via-fuchsia-100/70 to-blue-200/70 blur-3xl sm:h-96 sm:w-96"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[10%] top-[18%] h-3 w-3 rounded-full bg-violet-400/70 motion-safe:animate-pulse"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-[12%] top-[30%] h-4 w-4 rounded-full bg-blue-300/80 motion-safe:animate-pulse"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[16%] left-[18%] h-2 w-2 rounded-full bg-fuchsia-400/70 motion-safe:animate-pulse"
              />

              <div className="relative z-10 w-full max-w-lg animate-[jobhubFloat_6s_ease-in-out_infinite] motion-reduce:animate-none">
                <Image
                  src="/hero-illustration.svg"
                  alt="Cơ hội việc làm"
                  width={400}
                  height={300}
                  className="h-auto w-full object-contain drop-shadow-[0_24px_30px_rgba(124,58,237,0.10)]"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================
          2. POPULAR CATEGORIES
          ==================================== */}

      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/60 via-white to-blue-50/40 py-16 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-16 h-72 w-72 rounded-full bg-violet-100/60 blur-3xl"
        />

        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-700">
                <Zap className="h-3.5 w-3.5" />
                Khám phá lĩnh vực
              </div>

              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Ngành nghề{" "}
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  phổ biến
                </span>
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Lựa chọn lĩnh vực phù hợp với định hướng của bạn.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/fields")
              }
              className="group inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-300 hover:bg-violet-50 hover:shadow-md"
            >
              Xem tất cả
              <ChevronRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-1" />
            </button>
          </div>

          <Carousel
            setApi={setApi}
            opts={{ align: "start" }}
            className="mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-6xl"
          >
            <CarouselContent>
              {categorySlides.map(
                (slide, slideIndex) => (
                  <CarouselItem key={slideIndex}>
                    <div className="grid grid-cols-2 gap-4 px-2 py-3 md:grid-cols-3 lg:grid-cols-6">
                      {slide.map(
                        (item, index) => {
                          const colors =
                            categoryColors[
                              item.color
                            ];

                          const Icon =
                            item.icon;

                          return (
                            <Card
                              key={`${slideIndex}-${index}`}
                              onClick={() =>
                                handleFieldSearch(
                                  item.title
                                )
                              }
                              className={`group min-h-[185px] cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-3 text-center shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-100/60 motion-safe:hover:-translate-y-2 ${colors.border} ${colors.glow}`}
                            >
                              <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-2">
                                <div
                                  className={`rounded-2xl p-4 transition-transform duration-300 motion-safe:group-hover:scale-110 ${colors.icon}`}
                                >
                                  <Icon className="h-8 w-8" />
                                </div>

                                <p className="text-sm font-semibold leading-relaxed text-slate-800 transition-colors group-hover:text-violet-700">
                                  {item.title}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        }
                      )}
                    </div>
                  </CarouselItem>
                )
              )}
            </CarouselContent>

            <CarouselPrevious className="border-violet-100 bg-white text-violet-600 shadow-sm hover:bg-violet-50" />
            <CarouselNext className="border-violet-100 bg-white text-violet-600 shadow-sm hover:bg-violet-50" />
          </Carousel>

          <div className="mt-5 flex justify-center gap-2.5">
            {Array.from(
              { length: count },
              (_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() =>
                    api?.scrollTo(index)
                  }
                  aria-label={`Đi đến slide ${index + 1}`}
                  aria-current={
                    index + 1 === current
                      ? "true"
                      : undefined
                  }
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    index + 1 === current
                      ? "w-8 bg-gradient-to-r from-violet-600 to-blue-500"
                      : "w-2.5 bg-slate-300 hover:bg-violet-300"
                  }`}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* ====================================
          3. INTRODUCTION
          ==================================== */}

      <section className="relative overflow-hidden bg-white py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="relative flex items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute h-72 w-72 rounded-full bg-gradient-to-br from-blue-100 via-violet-100 to-pink-100 blur-2xl"
              />

              <div className="relative z-10 rounded-[2rem] border border-violet-100/70 bg-gradient-to-br from-violet-50/60 to-blue-50/60 p-6 shadow-sm sm:p-10">
                <Image
                  src="/undraw_hiring_8szx.svg"
                  alt="Hiring illustration"
                  width={400}
                  height={300}
                  className="h-auto w-full max-w-md object-contain transition-transform duration-500 motion-safe:hover:scale-105"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <Shield className="h-4 w-4" />
                Đồng hành cùng sự nghiệp
              </div>

              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Cổng thông tin việc làm{" "}
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  đáng tin cậy
                </span>
                {" "}và phổ biến
              </h2>

              <p className="text-base leading-8 text-slate-600 sm:text-lg">
                Hơn 10 năm kinh nghiệm trong lĩnh vực tuyển dụng,
                chúng tôi tự hào mang đến cho bạn những cơ hội
                việc làm chất lượng cao từ các doanh nghiệp
                uy tín hàng đầu Việt Nam.
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700">
                  <CheckCircle className="h-4 w-4" />
                  Cơ hội đa dạng
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                  <CheckCircle className="h-4 w-4" />
                  Kết nối dễ dàng
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-2 sm:flex-row">
                <Button
                  onClick={() =>
                    router.push("/login")
                  }
                  className="group rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 text-white shadow-md shadow-violet-200 transition-all duration-300 hover:from-violet-700 hover:to-blue-600 motion-safe:hover:-translate-y-0.5"
                >
                  Tìm việc ngay
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform motion-safe:group-hover:translate-x-1" />
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(
                      "/employer/login"
                    )
                  }
                  className="rounded-xl border-violet-200 px-6 font-semibold text-violet-700 transition-all duration-300 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-800"
                >
                  Đăng việc làm
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================
          4. TOP COMPANIES
          ==================================== */}

      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 via-slate-50 to-violet-50/40 py-16 sm:py-20">
        <div className="container relative mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              <Building className="h-4 w-4" />
              Doanh nghiệp nổi bật
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Công ty{" "}
              <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                hàng đầu
              </span>
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Khám phá các doanh nghiệp và cơ hội nghề nghiệp phù hợp.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoadingCompanies
              ? Array.from(
                  { length: 8 },
                  (_, index) => (
                    <Card
                      key={index}
                      className="rounded-2xl border-slate-200 bg-white"
                    >
                      <CardContent className="p-6">
                        <div className="mb-4 flex justify-end">
                          <div className="h-5 w-5 animate-pulse rounded bg-slate-200" />
                        </div>

                        <div className="mb-6 flex justify-center">
                          <div className="h-24 w-24 animate-pulse rounded-xl bg-slate-200" />
                        </div>

                        <div className="space-y-3">
                          <div className="h-5 animate-pulse rounded bg-slate-200" />
                          <div className="mx-auto h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                          <div className="mx-auto h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                        </div>
                      </CardContent>
                    </Card>
                  )
                )
              : companiesResponse?.data?.map(
                  (company) => {
                    const logoUrl =
                      getLogoUrl(
                        company.avatarPic
                      );

                    return (
                      <Card
                        key={company.id}
                        onClick={() =>
                          handleCompanyClick(
                            company.id
                          )
                        }
                        className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60 motion-safe:hover:-translate-y-1.5"
                      >
                        <CardContent className="p-6">
                          <div className="mb-4 flex justify-end">
                            <FollowCompanyButton
                              companyId={
                                company.id
                              }
                            />
                          </div>

                          <div className="mb-6 flex justify-center">
                            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50 shadow-sm">
                              {logoUrl ? (
                                <Image
                                  src={
                                    logoUrl
                                  }
                                  unoptimized
                                  alt={`${company.nameCompany} logo`}
                                  width={96}
                                  height={96}
                                  className="h-full w-full object-contain p-2 transition-transform duration-300 motion-safe:group-hover:scale-110"
                                  onError={(
                                    e
                                  ) => {
                                    const target =
                                      e.target as HTMLImageElement;

                                    target.style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <Building className="h-12 w-12 text-violet-400" />
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 text-center">
                            <h3 className="line-clamp-2 font-bold text-slate-900 transition-colors group-hover:text-violet-700">
                              {
                                company.nameCompany
                              }
                            </h3>

                            <div className="flex items-center justify-center text-sm text-slate-500">
                              <MapPin className="mr-1.5 h-4 w-4 shrink-0 text-violet-500" />

                              <span className="line-clamp-1">
                                {company.provinceName ||
                                  company.provinceFullName ||
                                  "Chưa cập nhật"}
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700">
                              <BriefcaseBusiness className="h-3.5 w-3.5" />
                              {company.jobCount ||
                                0}{" "}
                              việc làm
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                ) || []}
          </div>

          <div className="mt-10 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                router.push("/companies")
              }
              className="group rounded-xl border-violet-200 bg-white px-6 font-semibold text-violet-700 shadow-sm transition-all duration-300 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-800"
            >
              Xem tất cả công ty
              <ArrowRight className="ml-2 h-4 w-4 transition-transform motion-safe:group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* ====================================
          5. APPLICATION PROCESS
          ==================================== */}

      <section className="relative overflow-hidden bg-white py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
              <Sparkles className="h-4 w-4" />
              Bắt đầu dễ dàng
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Quy trình{" "}
              <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                ứng tuyển
              </span>
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Chỉ với ba bước đơn giản để tiếp cận cơ hội nghề nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {applicationSteps.map(
              (item, index) => (
                <Card
                  key={index}
                  className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-violet-100/50 motion-safe:hover:-translate-y-1.5 ${item.borderColor}`}
                >
                  <div
                    aria-hidden="true"
                    className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-50 transition-transform duration-500 motion-safe:group-hover:scale-150"
                  />

                  <CardContent className="relative z-10 space-y-5 p-0">
                    <div className="flex justify-center">
                      <span
                        className={`inline-flex rounded-full px-4 py-1.5 text-sm font-extrabold ${item.iconColor}`}
                      >
                        Bước {item.step}
                      </span>
                    </div>

                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 p-3">
                      <Image
                        src={item.image}
                        alt={`Bước ${item.step}`}
                        width={80}
                        height={80}
                        className="object-contain transition-transform duration-300 motion-safe:group-hover:scale-110"
                      />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900">
                      {item.title}
                    </h3>

                    <p className="leading-7 text-slate-500">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        </div>
      </section>

      {/* ====================================
          6. LATEST JOBS
          ==================================== */}

      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/50 via-white to-blue-50/50 py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                <BriefcaseBusiness className="h-4 w-4" />
                Cơ hội mới
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Việc làm{" "}
                <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                  mới nhất
                </span>
              </h2>

              <p className="mt-3 text-sm text-slate-500">
                Cập nhật những vị trí tuyển dụng mới trên JobHub.
              </p>
            </div>
          </div>

          {isLoadingJobs ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from(
                { length: 4 },
                (_, index) => (
                  <Card
                    key={index}
                    className="animate-pulse rounded-2xl border-slate-200 bg-white"
                  >
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-200" />

                        <div className="space-y-2">
                          <div className="h-5 w-32 rounded bg-slate-200" />
                          <div className="h-4 w-24 rounded bg-slate-200" />
                        </div>
                      </div>

                      <div className="h-5 w-5 rounded bg-slate-200" />
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="h-4 w-3/4 rounded bg-slate-200" />
                      <div className="h-8 w-full rounded bg-slate-200" />
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {(jobsResponse?.data?.data ||
                []).map((job: any) => {
                const logoUrl =
                  getLogoUrl(
                    getCompanyLogoFromJob(job)
                  );

                return (
                  <Card
                    key={job.id}
                    onClick={() =>
                      router.push(
                        `/jobs/${job.id}`
                      )
                    }
                    className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60 motion-safe:hover:-translate-y-1"
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-violet-100 bg-violet-50">
                          {logoUrl ? (
                            <Image
                              src={logoUrl}
                              unoptimized
                              alt={`${job.company?.nameCompany || job.nameCompany || "Công ty"} logo`}
                              width={48}
                              height={48}
                              className="h-full w-full object-contain p-1"
                              onError={(e) => {
                                const target =
                                  e.target as HTMLImageElement;

                                target.style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <Building className="h-6 w-6 text-violet-500" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <CardTitle className="line-clamp-2 text-lg font-bold text-slate-900 transition-colors group-hover:text-violet-700">
                            {job.nameJob}
                          </CardTitle>

                          <CardDescription className="mt-1 line-clamp-1">
                            {job.company
                              ?.nameCompany ||
                              job.nameCompany}
                          </CardDescription>
                        </div>
                      </div>

                      <div
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >
                        <SavedJobButton
                          jobId={job.id}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-violet-500" />
                          {job.province
                            ?.nameWithType ||
                            "Không xác định"}
                        </span>

                        <span className="font-semibold text-emerald-600">
                          {formatSalary(
                            job.salaryMin,
                            job.salaryMax
                          )}
                        </span>

                        {job.experience && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {job.experience}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Badge
                          variant="secondary"
                          onClick={(e) =>
                            e.stopPropagation()
                          }
                          className="rounded-full bg-violet-50 px-3 py-1 text-violet-700 hover:bg-violet-100"
                        >
                          {job.typeWork}
                        </Badge>

                        <ApplyButton
                          jobId={job.id}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!isLoadingJobs &&
            (!jobsResponse?.data?.data ||
              jobsResponse.data.data.length ===
                0) && (
              <div className="rounded-2xl border border-dashed border-violet-200 bg-white py-16 text-center">
                <BriefcaseBusiness className="mx-auto mb-4 h-10 w-10 text-violet-300" />

                <p className="font-medium text-slate-500">
                  Chưa có việc làm nào
                </p>
              </div>
            )}

          <div className="mt-10 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                router.push("/search")
              }
              className="group rounded-xl border-violet-200 bg-white px-6 font-semibold text-violet-700 shadow-sm transition-all duration-300 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-800"
            >
              Xem tất cả việc làm
              <ArrowRight className="ml-2 h-4 w-4 transition-transform motion-safe:group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* ====================================
          ANIMATION CSS
          ==================================== */}

      <style jsx global>{`
        @keyframes jobhubFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-14px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-\\[jobhubFloat_6s_ease-in-out_infinite\\] {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
