'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutTemplate,
  Mail,
  MapPin,
  Palette,
  PanelLeft,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
  X,
  Download,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/utils/toast';

import {
  cvBuilderService,
  type CVData,
} from '@/services/cvBuilderService';

// =====================================================
// TYPES
// =====================================================

type SidebarTab =
  | 'content'
  | 'design'
  | 'sections'
  | 'template';

type TemplateKey =
  | 'modern'
  | 'professional'
  | 'minimal';

type ThemeColor =
  | 'purple'
  | 'green'
  | 'blue'
  | 'black'
  | 'orange';

interface EditorSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  themeColor: ThemeColor;
  customColor: string;
}
type CVTheme = {
  main: string;
  light: string;
  text: string;
  border: string;
};

type CVTemplateProps = {
  cvData: CVData;
  settings: EditorSettings;
  theme: CVTheme;

  updatePersonalInfo: (
    field: keyof CVData['personalInfo'],
    value: string
  ) => void;

  handleAvatarChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;

  addEducation: () => void;
  updateEducation: (
    index: number,
    field: keyof CVData['education'][number],
    value: string
  ) => void;
  removeEducation: (index: number) => void;

  addExperience: () => void;
  updateExperience: (
    index: number,
    field: keyof CVData['experience'][number],
    value: string
  ) => void;
  removeExperience: (index: number) => void;

  addProject: () => void;
  updateProject: (
    index: number,
    field: keyof CVData['projects'][number],
    value: string | string[]
  ) => void;
  removeProject: (index: number) => void;

  addCertificate: () => void;
  updateCertificate: (
    index: number,
    field: keyof CVData['certificates'][number],
    value: string
  ) => void;
  removeCertificate: (index: number) => void;

  addEmptySkill: () => void;
  updateSkill: (index: number, value: string) => void;
  removeSkill: (index: number) => void;
};
// =====================================================
// CONSTANTS
// =====================================================

const THEME_COLORS: Record<
  ThemeColor,
  {
    main: string;
    light: string;
    text: string;
    border: string;
  }
> = {
  purple: {
    main: '#7c3aed',
    light: '#f5f3ff',
    text: '#6d28d9',
    border: '#ddd6fe',
  },

  green: {
    main: '#16a34a',
    light: '#f0fdf4',
    text: '#15803d',
    border: '#bbf7d0',
  },

  blue: {
    main: '#2563eb',
    light: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
  },

  black: {
    main: '#111827',
    light: '#f3f4f6',
    text: '#111827',
    border: '#d1d5db',
  },

  orange: {
    main: '#ea580c',
    light: '#fff7ed',
    text: '#c2410c',
    border: '#fed7aa',
  },
};
const APP_PRIMARY = '#7c3aed';
const APP_PRIMARY_LIGHT = '#f5f3ff';
const APP_PRIMARY_BORDER = '#ddd6fe';
const FONT_OPTIONS = [
  'Arial',
  'Roboto',
  'Inter',
  'Times New Roman',
  'Georgia',
];

// =====================================================
// COMPONENT
// =====================================================

export default function CVEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cvIdParam = searchParams.get('id');
  const {
    isAuthenticated,
    isLoading,
    userType,
  } = useAuth();

  // =====================================================
  // TEMPLATE
  // =====================================================

  const initialTemplateKey =
    searchParams.get('template');

  const [templateKey, setTemplateKey] =
    useState<TemplateKey>(
      initialTemplateKey === 'professional' ||
      initialTemplateKey === 'minimal'
        ? initialTemplateKey
        : 'modern'
    );

  // =====================================================
  // MAIN STATE
  // =====================================================

  const [title, setTitle] =
    useState('CV chưa đặt tên');

  const [cvId, setCvId] =
    useState<number | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isLoadingSavedCV, setIsLoadingSavedCV] =
  useState(false);

  const [activeTab, setActiveTab] =
  useState<SidebarTab>('design');

  const [skillInput, setSkillInput] =
    useState('');

  const [settings, setSettings] =
    useState<EditorSettings>({
      fontFamily: 'Arial',
      fontSize: 14,
      lineHeight: 1.5,
      themeColor: 'purple',
      customColor: '#7c3aed',
    });

  const [cvData, setCVData] =
    useState<CVData>({
      personalInfo: {
        fullName: '',
        jobTitle: '',
        email: '',
        phone: '',
        address: '',
        summary: '',
        avatar: '',
        dateOfBirth: '',
        gender: '',
        website: '',
      },

      education: [],
      experience: [],
      skills: [],
      projects: [],
      certificates: [],
    });

  const hexToRgb = (hex?: string) => {
    const safeHex =
      typeof hex === 'string' && hex.trim()
        ? hex
        : '#7c3aed';

    const cleanHex = safeHex.replace('#', '');

    const fullHex =
      cleanHex.length === 3
        ? cleanHex
            .split('')
            .map((char) => char + char)
            .join('')
        : cleanHex;

    const value = parseInt(fullHex, 16);

    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  };

  const mixWithWhite = (
    hex: string | undefined,
    amount: number
  ) => {
    const { r, g, b } = hexToRgb(hex);

    const mix = (channel: number) =>
      Math.round(
        channel +
          (255 - channel) * amount
      );

    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  };

  const activeThemeColor =
    settings.customColor ||
    THEME_COLORS[settings.themeColor]?.main ||
    '#7c3aed';

  const theme: CVTheme = {
    main: activeThemeColor,
    text: activeThemeColor,
    light: mixWithWhite(activeThemeColor, 0.92),
    border: mixWithWhite(activeThemeColor, 0.72),
  };
  // =====================================================
  // CHANGE TEMPLATE
  // =====================================================

  const handleChangeTemplate = (
    newTemplateKey: TemplateKey
  ) => {
    setTemplateKey(newTemplateKey);

    const params =
      new URLSearchParams(
        window.location.search
      );

    params.set(
      'template',
      newTemplateKey
    );

    window.history.replaceState(
      null,
      '',
      `/cv-builder/editor?${params.toString()}`
    );
  };

  // =====================================================
  // AUTH
  // =====================================================

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      showToast.warning(
        'Vui lòng đăng nhập để sử dụng CV Builder'
      );

      router.push('/login');

      return;
    }

    if (userType !== 'user') {
      showToast.warning(
        'CV Builder chỉ dành cho tài khoản ứng viên'
      );

      router.push('/');

      return;
    }
  }, [
    isAuthenticated,
    isLoading,
    userType,
    router,
  ]);

  // =====================================================
// LOAD SAVED CV FOR EDITING
// =====================================================

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || userType !== 'user') {
      return;
    }

    if (!cvIdParam) {
      return;
    }

    const id = Number(cvIdParam);

    if (!Number.isInteger(id) || id <= 0) {
      showToast.error('CV không hợp lệ');
      router.push('/my-cvs');
      return;
    }

    let cancelled = false;

    const loadSavedCV = async () => {
      try {
        setIsLoadingSavedCV(true);

        const savedCV =
          await cvBuilderService.getCV(id);

        if (cancelled) {
          return;
        }

        setCvId(savedCV.id);

        setTitle(
          savedCV.title || 'CV chưa đặt tên'
        );

        if (
          savedCV.templateKey === 'modern' ||
          savedCV.templateKey === 'professional' ||
          savedCV.templateKey === 'minimal'
        ) {
          setTemplateKey(savedCV.templateKey);
        }

        setCVData(savedCV.cvData);

        if (savedCV.settings) {
          setSettings({
            fontFamily: savedCV.settings.fontFamily || 'Arial',
            fontSize: savedCV.settings.fontSize ?? 14,
            lineHeight: savedCV.settings.lineHeight ?? 1.5,
            themeColor: savedCV.settings.themeColor || 'purple',
            customColor: savedCV.settings.customColor || '#7c3aed',
          });
        }

        // Đồng bộ template trên URL
        const params =
          new URLSearchParams(
            window.location.search
          );

        params.set(
          'template',
          savedCV.templateKey
        );

        window.history.replaceState(
          null,
          '',
          `/cv-builder/editor?${params.toString()}`
        );
      } catch (error) {
        console.error(
          'Lỗi tải CV:',
          error
        );

        showToast.error(
          'Không thể tải CV. CV có thể không tồn tại hoặc bạn không có quyền truy cập.'
        );

        router.push('/my-cvs');
      } finally {
        if (!cancelled) {
          setIsLoadingSavedCV(false);
        }
      }
    };

    loadSavedCV();

    return () => {
      cancelled = true;
    };
  }, [
    cvIdParam,
    isAuthenticated,
    isLoading,
    userType,
    router,
  ]);

  // =====================================================
  // PERSONAL INFO
  // =====================================================

  const updatePersonalInfo = (
    field: keyof CVData['personalInfo'],
    value: string
  ) => {
    setCVData((prev) => ({
      ...prev,

      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const handleAvatarChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast.warning('Vui lòng chọn file ảnh');
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast.warning('Ảnh không được vượt quá 5MB');
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        updatePersonalInfo('avatar', reader.result);
      }
    };

    reader.onerror = () => {
      showToast.error('Không thể đọc ảnh. Vui lòng thử lại.');
    };

    reader.readAsDataURL(file);
  };

  // =====================================================
  // EDUCATION
  // =====================================================

  const addEducation = () => {
    setCVData((prev) => ({
      ...prev,

      education: [
        ...prev.education,
        {
          school: '',
          major: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    }));
  };

  const updateEducation = (
    index: number,
    field: keyof CVData['education'][number],
    value: string
  ) => {
    setCVData((prev) => ({
      ...prev,

      education:
        prev.education.map(
          (item, currentIndex) =>
            currentIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        ),
    }));
  };

  const removeEducation = (
    index: number
  ) => {
    setCVData((prev) => ({
      ...prev,

      education:
        prev.education.filter(
          (_, currentIndex) =>
            currentIndex !== index
        ),
    }));
  };

  // =====================================================
  // EXPERIENCE
  // =====================================================

  const addExperience = () => {
    setCVData((prev) => ({
      ...prev,

      experience: [
        ...prev.experience,
        {
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    }));
  };

  const updateExperience = (
    index: number,
    field: keyof CVData['experience'][number],
    value: string
  ) => {
    setCVData((prev) => ({
      ...prev,

      experience:
        prev.experience.map(
          (item, currentIndex) =>
            currentIndex === index
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        ),
    }));
  };

  const removeExperience = (
    index: number
  ) => {
    setCVData((prev) => ({
      ...prev,

      experience:
        prev.experience.filter(
          (_, currentIndex) =>
            currentIndex !== index
        ),
    }));
  };

  // =====================================================
  // PROJECT
  // =====================================================

  const addProject = () => {
    setCVData((prev) => ({
      ...prev,

      projects: [
        ...prev.projects,
        {
          name: '',
          role: '',
          startDate: '',
          endDate: '',
          description: '',
          technologies: [],
          link: '',
        },
      ],
    }));
  };

  const updateProject = (
    index: number,
    field: keyof CVData['projects'][number],
    value: string | string[]
  ) => {
    setCVData((prev) => ({
      ...prev,

      projects:
        prev.projects.map(
          (project, currentIndex) =>
            currentIndex === index
              ? {
                  ...project,
                  [field]: value,
                }
              : project
        ),
    }));
  };

  const removeProject = (
    index: number
  ) => {
    setCVData((prev) => ({
      ...prev,

      projects:
        prev.projects.filter(
          (_, currentIndex) =>
            currentIndex !== index
        ),
    }));
  };

  const updateProjectTechnologies = (
    index: number,
    value: string
  ) => {
    const technologies =
      value
        .split(',')
        .map((item) =>
          item.trim()
        )
        .filter(Boolean);

    updateProject(
      index,
      'technologies',
      technologies
    );
  };

  // =====================================================
  // CERTIFICATE
  // =====================================================

  const addCertificate = () => {
    setCVData((prev) => ({
      ...prev,

      certificates: [
        ...prev.certificates,
        {
          name: '',
          organization: '',
          date: '',
          description: '',
        },
      ],
    }));
  };

  const updateCertificate = (
    index: number,
    field: keyof CVData['certificates'][number],
    value: string
  ) => {
    setCVData((prev) => ({
      ...prev,

      certificates:
        prev.certificates.map(
          (
            certificate,
            currentIndex
          ) =>
            currentIndex === index
              ? {
                  ...certificate,
                  [field]: value,
                }
              : certificate
        ),
    }));
  };

  const removeCertificate = (
    index: number
  ) => {
    setCVData((prev) => ({
      ...prev,

      certificates:
        prev.certificates.filter(
          (_, currentIndex) =>
            currentIndex !== index
        ),
    }));
  };

  // =====================================================
  // SKILL
  // =====================================================

  const addSkill = () => {
    const skill =
      skillInput.trim();

    if (!skill) {
      return;
    }

    const exists =
      cvData.skills.some(
        (item) =>
          item.toLowerCase() ===
          skill.toLowerCase()
      );

    if (exists) {
      showToast.warning(
        'Kỹ năng này đã tồn tại'
      );

      return;
    }

    setCVData((prev) => ({
      ...prev,

      skills: [
        ...prev.skills,
        skill,
      ],
    }));

    setSkillInput('');
  };
  const addEmptySkill = () => {
    setCVData((prev) => ({
      ...prev,
      skills: [...prev.skills, ''],
    }));
  };

  const updateSkill = (
    index: number,
    value: string
  ) => {
    setCVData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill, currentIndex) =>
        currentIndex === index ? value : skill
      ),
    }));
  };
  const removeSkill = (
    index: number
  ) => {
    setCVData((prev) => ({
      ...prev,

      skills:
        prev.skills.filter(
          (_, currentIndex) =>
            currentIndex !== index
        ),
    }));
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = async () => {
    if (!title.trim()) {
      showToast.warning(
        'Vui lòng nhập tên CV'
      );

      return;
    }

    if (
      !cvData.personalInfo.fullName.trim()
    ) {
      showToast.warning(
        'Vui lòng nhập họ và tên'
      );

      return;
    }

    try {
      setIsSaving(true);

      if (cvId === null) {
        const savedCV =
          await cvBuilderService.createCV({
            title: title.trim(),
            templateKey,
            cvData,
            settings,
          });

        setCvId(
          savedCV.id
        );

        showToast.success(
          'Lưu CV thành công'
        );

        return;
      }

      await cvBuilderService.updateCV(
        cvId,
        {
          title: title.trim(),
          templateKey,
          cvData,
          settings,
        }
      );

      showToast.success(
        'Cập nhật CV thành công'
      );
    } catch (error) {
      console.error(
        'Lỗi lưu CV:',
        error
      );

      showToast.error(
        'Không thể lưu CV. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadCV = () => {
    const cvElement = document.getElementById('cv-print-area');

    if (!cvElement) {
      showToast.error('Không tìm thấy nội dung CV để tải xuống.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1200');

    if (!printWindow) {
      showToast.error('Không thể mở cửa sổ tải CV. Vui lòng cho phép popup.');
      return;
    }

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((element) => element.outerHTML)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'CV'}</title>

          ${styles}

          <style>
            @page {
              size: A4;
              margin: 0;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm;
              background: white !important;
            }

            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }

            #cv-print-area {
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            #cv-print-area > * {
              margin: 0 !important;
              box-shadow: none !important;
            }

            input,
            textarea {
              border-color: transparent !important;
              outline: none !important;
              box-shadow: none !important;
            }

            textarea {
              resize: none !important;
              overflow: hidden !important;
            }
          </style>
        </head>

        <body>
          <div id="cv-print-area">
            ${cvElement.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };
  // =====================================================
  // SECTION ADD
  // =====================================================

  const handleAddSection = (
    type:
      | 'education'
      | 'experience'
      | 'project'
      | 'certificate'
  ) => {
    if (type === 'education') {
      addEducation();
    }

    if (type === 'experience') {
      addExperience();
    }

    if (type === 'project') {
      addProject();
    }

    if (type === 'certificate') {
      addCertificate();
    }

    setActiveTab('content');
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading || isLoadingSavedCV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-4 border-gray-200 border-t-violet-600 animate-spin mx-auto mb-4" />

          <p className="text-gray-600">
            {isLoadingSavedCV
              ? 'Đang tải CV của bạn...'
              : 'Đang tải CV Builder...'}
          </p>
        </div>
      </div>
    );
  }

  if (
    !isAuthenticated ||
    userType !== 'user'
  ) {
    return null;
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f4f5f7] text-gray-900">

      {/* =================================================
          TOP HEADER
      ================================================= */}

      <header className="no-print h-[68px] bg-white border-b sticky top-0 z-50">
        <div className="h-full px-5 flex items-center justify-between gap-4">

          {/* LEFT */}

          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/cv-builder'
                )
              }
              className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: APP_PRIMARY_LIGHT,
                color: APP_PRIMARY,
              }}
            >
              <FileText className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <Input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                className="border-0 shadow-none p-0 h-auto text-lg md:text-xl font-bold focus-visible:ring-0 bg-transparent max-w-[320px]"
              />

              <p className="text-xs text-gray-400 mt-1">
                Mẫu {templateKey}
              </p>
            </div>
          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-2">

            

            <Button
              onClick={
                handleSave
              }
              disabled={
                isSaving
              }
              className="rounded-full px-5 text-white"
            >
              <Save className="w-4 h-4 mr-2" />

              {isSaving
                ? 'Đang lưu...'
                : cvId
                  ? 'Cập nhật CV'
                  : 'Lưu CV'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadCV}
              className="rounded-full px-5 text-gray-700 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Tải CV
            </Button>

          </div>
        </div>
      </header>

      {/* =================================================
          WORKSPACE
      ================================================= */}

      <div className="flex min-h-[calc(100vh-68px)]">

        {/* =================================================
            LEFT TOOLBAR
        ================================================= */}

        <aside className="no-print hidden lg:flex w-[155px] bg-white border-r flex-col shrink-0 sticky top-[68px] h-[calc(100vh-68px)]">

          

          <SidebarButton
            active={
              activeTab ===
              'design'
            }
            icon={
              <Palette className="w-5 h-5" />
            }
            label="Thiết kế & Font"
            onClick={() =>
              setActiveTab(
                'design'
              )
            }
            
          />

          <SidebarButton
            active={
              activeTab ===
              'sections'
            }
            icon={
              <Plus className="w-5 h-5" />
            }
            label="Thêm mục"
            onClick={() =>
              setActiveTab(
                'sections'
              )
            }
          
          />

          <SidebarButton
            active={
              activeTab ===
              'template'
            }
            icon={
              <LayoutTemplate className="w-5 h-5" />
            }
            label="Đổi mẫu CV"
            onClick={() =>
              setActiveTab(
                'template'
              )
            }
            
          />

          <div className="mt-auto border-t">
            <button
              type="button"
              onClick={() =>
                router.push(
                  '/cv-builder'
                )
              }
              className="w-full px-4 py-5 flex flex-col items-center gap-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <PanelLeft className="w-5 h-5" />
              Chọn mẫu
            </button>
          </div>

        </aside>

        {/* =================================================
            SETTINGS PANEL
        ================================================= */}

        {activeTab !== 'content' && (
          <aside className="no-print w-full lg:w-[390px] xl:w-[410px] bg-white border-r shrink-0 h-[calc(100vh-68px)] overflow-y-auto">
          {activeTab === 'content' && (
            <div className="p-5">

              <PanelHeader
                title="Nội dung CV"
                subtitle="Điền thông tin của bạn"
                icon={
                  <UserRound
                    className="w-5 h-5"
                    style={{
                      color:
                        theme.main,
                    }}
                  />
                }
              />

              <div className="mt-6">

                {/* PERSONAL INFO */}

                <EditorSection
                  title="Thông tin cá nhân"
                  icon={
                    <UserRound className="w-4 h-4" />
                  }
                  defaultOpen
                >
                  <div className="space-y-4">

                    <FieldLabel label="Ảnh cá nhân">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full border bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                          {cvData.personalInfo.avatar ? (
                            <img
                              src={cvData.personalInfo.avatar}
                              alt="Ảnh cá nhân"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserRound className="w-8 h-8 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <label className="inline-flex items-center justify-center px-4 py-2 rounded-lg border bg-white text-sm font-medium cursor-pointer hover:bg-gray-50">
                            Chọn ảnh

                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleAvatarChange}
                              className="hidden"
                            />
                          </label>

                          <p className="text-xs text-gray-400 mt-2">
                            PNG, JPG hoặc WEBP. Tối đa 5MB.
                          </p>
                        </div>
                      </div>
                    </FieldLabel>

                    <FieldLabel label="Họ và tên">
                      <Input
                        value={
                          cvData.personalInfo.fullName
                        }
                        onChange={(e) =>
                          updatePersonalInfo(
                            'fullName',
                            e.target.value
                          )
                        }
                        placeholder="Nguyễn Văn A"
                      />
                    </FieldLabel>

                    <FieldLabel label="Vị trí ứng tuyển">
                      <Input
                        value={
                          cvData.personalInfo.jobTitle
                        }
                        onChange={(e) =>
                          updatePersonalInfo(
                            'jobTitle',
                            e.target.value
                          )
                        }
                        placeholder="Business Analyst"
                      />
                    </FieldLabel>

                    <FieldLabel label="Email">
                      <Input
                        type="email"
                        value={
                          cvData.personalInfo.email
                        }
                        onChange={(e) =>
                          updatePersonalInfo(
                            'email',
                            e.target.value
                          )
                        }
                        placeholder="example@gmail.com"
                      />
                    </FieldLabel>

                    <FieldLabel label="Số điện thoại">
                      <Input
                        value={
                          cvData.personalInfo.phone
                        }
                        onChange={(e) =>
                          updatePersonalInfo(
                            'phone',
                            e.target.value
                          )
                        }
                        placeholder="0123 456 789"
                      />
                    </FieldLabel>

                    <FieldLabel label="Địa chỉ">
                      <Input
                        value={
                          cvData.personalInfo.address
                        }
                        onChange={(e) =>
                          updatePersonalInfo(
                            'address',
                            e.target.value
                          )
                        }
                        placeholder="Hà Nội"
                      />
                    </FieldLabel>

                    <FieldLabel label="Mục tiêu nghề nghiệp">
                      <textarea
                        value={
                          cvData.personalInfo.summary
                        }
                        onChange={(e) =>
                          updatePersonalInfo(
                            'summary',
                            e.target.value
                          )
                        }
                        placeholder="Giới thiệu ngắn gọn về bản thân, mục tiêu nghề nghiệp và định hướng phát triển..."
                        className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </FieldLabel>

                  </div>
                </EditorSection>

                {/* EDUCATION */}

                <EditorSection
                  title="Học vấn"
                  icon={
                    <GraduationCap className="w-4 h-4" />
                  }
                  count={
                    cvData.education.length
                  }
                  onAdd={
                    addEducation
                  }
                >
                  {cvData.education.length === 0 ? (
                    <EmptyText text="Chưa có thông tin học vấn. Nhấn Thêm để tạo." />
                  ) : (
                    <div className="space-y-4">

                      {cvData.education.map(
                        (
                          education,
                          index
                        ) => (
                          <ItemBox
                            key={index}
                            title={`Học vấn ${index + 1}`}
                            onDelete={() =>
                              removeEducation(
                                index
                              )
                            }
                          >

                            <FieldLabel label="Trường học">
                              <Input
                                value={
                                  education.school
                                }
                                onChange={(e) =>
                                  updateEducation(
                                    index,
                                    'school',
                                    e.target.value
                                  )
                                }
                                placeholder="Đại học..."
                              />
                            </FieldLabel>

                            <FieldLabel label="Ngành học">
                              <Input
                                value={
                                  education.major
                                }
                                onChange={(e) =>
                                  updateEducation(
                                    index,
                                    'major',
                                    e.target.value
                                  )
                                }
                                placeholder="Công nghệ thông tin"
                              />
                            </FieldLabel>

                            <div className="grid grid-cols-2 gap-3">

                              <FieldLabel label="Bắt đầu">
                                <Input
                                  value={
                                    education.startDate
                                  }
                                  onChange={(e) =>
                                    updateEducation(
                                      index,
                                      'startDate',
                                      e.target.value
                                    )
                                  }
                                  placeholder="09/2023"
                                />
                              </FieldLabel>

                              <FieldLabel label="Kết thúc">
                                <Input
                                  value={
                                    education.endDate
                                  }
                                  onChange={(e) =>
                                    updateEducation(
                                      index,
                                      'endDate',
                                      e.target.value
                                    )
                                  }
                                  placeholder="06/2027"
                                />
                              </FieldLabel>

                            </div>

                            <FieldLabel label="Mô tả">
                              <textarea
                                className="editor-textarea"
                                value={
                                  education.description
                                }
                                onChange={(e) =>
                                  updateEducation(
                                    index,
                                    'description',
                                    e.target.value
                                  )
                                }
                                placeholder="Thành tích, GPA, hoạt động..."
                              />
                            </FieldLabel>

                          </ItemBox>
                        )
                      )}

                    </div>
                  )}
                </EditorSection>

                {/* EXPERIENCE */}

                <EditorSection
                  title="Kinh nghiệm làm việc"
                  icon={
                    <BriefcaseBusiness className="w-4 h-4" />
                  }
                  count={
                    cvData.experience.length
                  }
                  onAdd={
                    addExperience
                  }
                >
                                  {cvData.experience.length === 0 ? (
                    <EmptyText text="Chưa có kinh nghiệm làm việc. Nhấn Thêm để tạo." />
                  ) : (
                    <div className="space-y-4">

                      {cvData.experience.map(
                        (
                          experience,
                          index
                        ) => (
                          <ItemBox
                            key={index}
                            title={`Kinh nghiệm ${index + 1}`}
                            onDelete={() =>
                              removeExperience(
                                index
                              )
                            }
                          >

                            <FieldLabel label="Tên công ty">
                              <Input
                                value={
                                  experience.company
                                }
                                onChange={(e) =>
                                  updateExperience(
                                    index,
                                    'company',
                                    e.target.value
                                  )
                                }
                                placeholder="Tên công ty"
                              />
                            </FieldLabel>

                            <FieldLabel label="Vị trí công việc">
                              <Input
                                value={
                                  experience.position
                                }
                                onChange={(e) =>
                                  updateExperience(
                                    index,
                                    'position',
                                    e.target.value
                                  )
                                }
                                placeholder="Business Analyst Intern"
                              />
                            </FieldLabel>

                            <div className="grid grid-cols-2 gap-3">

                              <FieldLabel label="Bắt đầu">
                                <Input
                                  value={
                                    experience.startDate
                                  }
                                  onChange={(e) =>
                                    updateExperience(
                                      index,
                                      'startDate',
                                      e.target.value
                                    )
                                  }
                                  placeholder="01/2026"
                                />
                              </FieldLabel>

                              <FieldLabel label="Kết thúc">
                                <Input
                                  value={
                                    experience.endDate
                                  }
                                  onChange={(e) =>
                                    updateExperience(
                                      index,
                                      'endDate',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Hiện tại"
                                />
                              </FieldLabel>

                            </div>

                            <FieldLabel label="Mô tả công việc">
                              <textarea
                                className="editor-textarea"
                                value={
                                  experience.description
                                }
                                onChange={(e) =>
                                  updateExperience(
                                    index,
                                    'description',
                                    e.target.value
                                  )
                                }
                                placeholder="Mô tả nhiệm vụ, trách nhiệm và thành tích..."
                              />
                            </FieldLabel>

                          </ItemBox>
                        )
                      )}

                    </div>
                  )}
                </EditorSection>

                {/* =================================================
                    PROJECTS
                ================================================= */}

                <EditorSection
                  title="Dự án"
                  icon={
                    <FolderKanban className="w-4 h-4" />
                  }
                  count={
                    cvData.projects.length
                  }
                  onAdd={
                    addProject
                  }
                >

                  {cvData.projects.length === 0 ? (
                    <EmptyText text="Chưa có dự án. Nhấn Thêm để tạo." />
                  ) : (
                    <div className="space-y-4">

                      {cvData.projects.map(
                        (
                          project,
                          index
                        ) => (
                          <ItemBox
                            key={index}
                            title={`Dự án ${index + 1}`}
                            onDelete={() =>
                              removeProject(
                                index
                              )
                            }
                          >

                            <FieldLabel label="Tên dự án">
                              <Input
                                value={
                                  project.name
                                }
                                onChange={(e) =>
                                  updateProject(
                                    index,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="Tên dự án"
                              />
                            </FieldLabel>

                            <FieldLabel label="Vai trò">
                              <Input
                                value={
                                  project.role
                                }
                                onChange={(e) =>
                                  updateProject(
                                    index,
                                    'role',
                                    e.target.value
                                  )
                                }
                                placeholder="Business Analyst"
                              />
                            </FieldLabel>

                            <div className="grid grid-cols-2 gap-3">

                              <FieldLabel label="Bắt đầu">
                                <Input
                                  value={
                                    project.startDate
                                  }
                                  onChange={(e) =>
                                    updateProject(
                                      index,
                                      'startDate',
                                      e.target.value
                                    )
                                  }
                                  placeholder="01/2026"
                                />
                              </FieldLabel>

                              <FieldLabel label="Kết thúc">
                                <Input
                                  value={
                                    project.endDate
                                  }
                                  onChange={(e) =>
                                    updateProject(
                                      index,
                                      'endDate',
                                      e.target.value
                                    )
                                  }
                                  placeholder="05/2026"
                                />
                              </FieldLabel>

                            </div>

                            <FieldLabel label="Mô tả dự án">
                              <textarea
                                className="editor-textarea"
                                value={
                                  project.description
                                }
                                onChange={(e) =>
                                  updateProject(
                                    index,
                                    'description',
                                    e.target.value
                                  )
                                }
                                placeholder="Mô tả dự án, nhiệm vụ và kết quả..."
                              />
                            </FieldLabel>

                            <FieldLabel label="Công nghệ / Kỹ năng">
                              <Input
                                value={
                                  project.technologies?.join(
                                    ', '
                                  ) || ''
                                }
                                onChange={(e) =>
                                  updateProjectTechnologies(
                                    index,
                                    e.target.value
                                  )
                                }
                                placeholder="React, Node.js, MySQL..."
                              />
                            </FieldLabel>

                            <FieldLabel label="Liên kết dự án">
                              <Input
                                value={
                                  project.link || ''
                                }
                                onChange={(e) =>
                                  updateProject(
                                    index,
                                    'link',
                                    e.target.value
                                  )
                                }
                                placeholder="https://..."
                              />
                            </FieldLabel>

                          </ItemBox>
                        )
                      )}

                    </div>
                  )}

                </EditorSection>

                {/* =================================================
                    SKILLS
                ================================================= */}

                <EditorSection
                  title="Kỹ năng"
                  icon={
                    <Wrench className="w-4 h-4" />
                  }
                  count={
                    cvData.skills.length
                  }
                  defaultOpen
                >

                  <div className="space-y-4">

                    <div className="flex gap-2">

                      <Input
                        value={
                          skillInput
                        }
                        onChange={(e) =>
                          setSkillInput(
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter'
                          ) {
                            e.preventDefault();

                            addSkill();
                          }
                        }}
                        placeholder="Ví dụ: SQL"
                      />

                      <Button
                        type="button"
                        onClick={
                          addSkill
                        }
                        style={{
                          backgroundColor:
                            theme.main,
                        }}
                        className="text-white shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>

                    </div>

                    {cvData.skills.length === 0 ? (
                      <EmptyText text="Chưa có kỹ năng. Nhập kỹ năng và nhấn dấu +." />
                    ) : (
                      <div className="flex flex-wrap gap-2">

                        {cvData.skills.map(
                          (
                            skill,
                            index
                          ) => (
                            <div
                              key={`${skill}-${index}`}
                              className="flex items-center gap-2 px-3 py-2 rounded-full text-sm border"
                              style={{
                                backgroundColor:
                                  theme.light,
                                borderColor:
                                  theme.border,
                                color:
                                  theme.text,
                              }}
                            >

                              <span>
                                {skill}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  removeSkill(
                                    index
                                  )
                                }
                                className="hover:opacity-60"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                            </div>
                          )
                        )}

                      </div>
                    )}

                  </div>

                </EditorSection>

                {/* =================================================
                    CERTIFICATES
                ================================================= */}

                <EditorSection
                  title="Chứng chỉ"
                  icon={
                    <Award className="w-4 h-4" />
                  }
                  count={
                    cvData.certificates.length
                  }
                  onAdd={
                    addCertificate
                  }
                >

                  {cvData.certificates.length === 0 ? (
                    <EmptyText text="Chưa có chứng chỉ. Nhấn Thêm để tạo." />
                  ) : (
                    <div className="space-y-4">

                      {cvData.certificates.map(
                        (
                          certificate,
                          index
                        ) => (
                          <ItemBox
                            key={index}
                            title={`Chứng chỉ ${index + 1}`}
                            onDelete={() =>
                              removeCertificate(
                                index
                              )
                            }
                          >

                            <FieldLabel label="Tên chứng chỉ">
                              <Input
                                value={
                                  certificate.name
                                }
                                onChange={(e) =>
                                  updateCertificate(
                                    index,
                                    'name',
                                    e.target.value
                                  )
                                }
                                placeholder="TOEIC, IELTS, Google Data Analytics..."
                              />
                            </FieldLabel>

                            <FieldLabel label="Tổ chức cấp">
                              <Input
                                value={
                                  certificate.organization
                                }
                                onChange={(e) =>
                                  updateCertificate(
                                    index,
                                    'organization',
                                    e.target.value
                                  )
                                }
                                placeholder="IIG Việt Nam"
                              />
                            </FieldLabel>

                            <FieldLabel label="Thời gian">
                              <Input
                                value={
                                  certificate.date
                                }
                                onChange={(e) =>
                                  updateCertificate(
                                    index,
                                    'date',
                                    e.target.value
                                  )
                                }
                                placeholder="06/2026"
                              />
                            </FieldLabel>

                            <FieldLabel label="Mô tả">
                              <textarea
                                className="editor-textarea"
                                value={
                                  certificate.description
                                }
                                onChange={(e) =>
                                  updateCertificate(
                                    index,
                                    'description',
                                    e.target.value
                                  )
                                }
                                placeholder="Điểm số hoặc thông tin bổ sung..."
                              />
                            </FieldLabel>

                          </ItemBox>
                        )
                      )}

                    </div>
                  )}

                </EditorSection>

              </div>
            </div>
          )}

          {/* =================================================
              DESIGN TAB
          ================================================= */}

          {activeTab === 'design' && (
            <div className="p-5">

              <PanelHeader
                title="Thiết kế & Font"
                subtitle="Tùy chỉnh giao diện CV"
                icon={
                  <Palette
                    className="w-5 h-5"
                    style={{
                      color:APP_PRIMARY,
                    }}
                  />
                }
              />

              <div className="mt-7 space-y-7">

                {/* FONT */}

                <div>

                  <label className="text-sm font-semibold text-gray-800">
                    Font chữ
                  </label>

                  <div className="relative mt-2">

                    <select
                      value={
                        settings.fontFamily
                      }
                      onChange={(e) =>
                        setSettings(
                          (
                            previousSettings
                          ) => ({
                            ...previousSettings,
                            fontFamily:
                              e.target.value,
                          })
                        )
                      }
                      className="w-full h-11 border rounded-lg px-3 appearance-none bg-white"
                    >

                      {FONT_OPTIONS.map(
                        (font) => (
                          <option
                            key={
                              font
                            }
                            value={
                              font
                            }
                          >
                            {font}
                          </option>
                        )
                      )}

                    </select>

                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />

                  </div>

                </div>

                {/* FONT SIZE */}

                <div>

                  <div className="flex items-center justify-between">

                    <label className="text-sm font-semibold text-gray-800">
                      Cỡ chữ
                    </label>

                    <span className="text-sm text-gray-500">
                      {settings.fontSize}px
                    </span>

                  </div>

                  <input
                    type="range"
                    min="11"
                    max="18"
                    step="1"
                    value={
                      settings.fontSize
                    }
                    onChange={(e) =>
                      setSettings(
                        (
                          previousSettings
                        ) => ({
                          ...previousSettings,
                          fontSize:
                            Number(
                              e.target.value
                            ),
                        })
                      )
                    }
                    className="w-full mt-3"
                  />

                </div>

                {/* LINE HEIGHT */}

                <div>

                  <div className="flex items-center justify-between">

                    <label className="text-sm font-semibold text-gray-800">
                      Khoảng cách dòng
                    </label>

                    <span className="text-sm text-gray-500">
                      {settings.lineHeight.toFixed(
                        1
                      )}
                    </span>

                  </div>

                  <input
                    type="range"
                    min="1.2"
                    max="2"
                    step="0.1"
                    value={
                      settings.lineHeight
                    }
                    onChange={(e) =>
                      setSettings(
                        (
                          previousSettings
                        ) => ({
                          ...previousSettings,
                          lineHeight:
                            Number(
                              e.target.value
                            ),
                        })
                      )
                    }
                    className="w-full mt-3"
                  />

                </div>

                {/* THEME COLOR */}

                {/* THEME COLOR */}
                <div>
                  <label className="text-sm font-semibold text-gray-800">
                    Màu chủ đề
                  </label>

                  {/* PRESET COLORS */}
                  <div className="flex flex-wrap gap-3 mt-3">
                    {[
                      '#574040',
                      '#43524C',
                      '#52798A',
                      '#52745C',
                      '#8B73B5',
                      '#9B514D',
                      '#1F2937',
                      '#2563EB',
                      '#7C3AED',
                      '#EA580C',
                    ].map((color) => {
                      const active =
                        settings.customColor.toLowerCase() ===
                        color.toLowerCase();

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              customColor: color,
                            }))
                          }
                          className="relative w-9 h-9 rounded-full border-2 transition hover:scale-110"
                          style={{
                            backgroundColor: color,
                            borderColor: active
                              ? '#111827'
                              : '#ffffff',
                            boxShadow:
                              '0 0 0 1px #d1d5db',
                          }}
                          title={color}
                        >
                          {active && (
                            <Check className="absolute inset-0 m-auto w-4 h-4 text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* CUSTOM COLOR */}
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Tùy chỉnh màu
                    </p>

                    <div className="relative h-[150px] rounded-xl overflow-hidden border">
                      <input
                        type="color"
                        value={settings.customColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            customColor: e.target.value,
                          }))
                        }
                        className="absolute inset-0 w-full h-full cursor-pointer border-0 p-0"
                        title="Chọn màu CV"
                      />
                    </div>

                    {/* HEX */}
                    <div className="flex gap-3 mt-3">
                      <div
                        className="w-14 h-10 rounded-lg border shrink-0"
                        style={{
                          backgroundColor:
                            settings.customColor,
                        }}
                      />

                      <div className="flex-1 h-10 rounded-lg border bg-gray-50 flex items-center px-3">
                        <span className="text-gray-400 mr-1">
                          #
                        </span>

                        <input
                          value={settings.customColor.replace(
                            '#',
                            ''
                          )}
                          maxLength={6}
                          onChange={(e) => {
                            const value =
                              e.target.value.replace(
                                /[^0-9a-fA-F]/g,
                                ''
                              );

                            if (value.length <= 6) {
                              setSettings((prev) => ({
                                ...prev,
                                customColor: `#${value}`,
                              }));
                            }
                          }}
                          className="w-full bg-transparent outline-none text-sm font-medium uppercase"
                          placeholder="574040"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      Chọn một gam màu hoặc nhập mã HEX.
                      Màu CV sẽ được cập nhật ngay lập tức.
                    </p>
                  </div>
                </div>

                <div
                  className="mt-8 rounded-xl p-4 text-sm"
                  style={{
                    backgroundColor:
                      theme.light,
                    color:
                      theme.text,
                    border:
                      `1px solid ${theme.border}`,
                  }}
                >
                  <div className="flex gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />

                    <p>
                      Các thay đổi về font, cỡ chữ,
                      khoảng cách dòng và màu sắc sẽ
                      được cập nhật trực tiếp trên bản
                      xem trước CV.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =================================================
              ADD SECTIONS TAB
          ================================================= */}

          {activeTab === 'sections' && (
            <div className="p-5">

              <PanelHeader
                title="Thêm mục"
                subtitle="Bổ sung nội dung cho CV"
                icon={
                  <Plus
                    className="w-5 h-5"
                    
                  />
                }
              />

              <div className="grid grid-cols-2 gap-3 mt-7">

                <AddSectionButton
                  icon={
                    <GraduationCap className="w-6 h-6" />
                  }
                  title="Học vấn"
                  onClick={() =>
                    handleAddSection(
                      'education'
                    )
                  }
                />

                <AddSectionButton
                  icon={
                    <BriefcaseBusiness className="w-6 h-6" />
                  }
                  title="Kinh nghiệm"
                  onClick={() =>
                    handleAddSection(
                      'experience'
                    )
                  }
                />

                <AddSectionButton
                  icon={
                    <FolderKanban className="w-6 h-6" />
                  }
                  title="Dự án"
                  onClick={() =>
                    handleAddSection(
                      'project'
                    )
                  }
                />

                <AddSectionButton
                  icon={
                    <Award className="w-6 h-6" />
                  }
                  title="Chứng chỉ"
                  onClick={() =>
                    handleAddSection(
                      'certificate'
                    )
                  }
                />

              </div>

            </div>
          )}

          {/* =================================================
              TEMPLATE TAB
          ================================================= */}

          {activeTab === 'template' && (
            <div className="p-5">

              <PanelHeader
                title="Đổi mẫu CV"
                subtitle="Chọn phong cách phù hợp với bạn"
                icon={
                  <LayoutTemplate
                    className="w-5 h-5"
                    style={{
                      color:
                        theme.main,
                    }}
                  />
                }
              />

              <div className="space-y-4 mt-7">

                <TemplateCard
                  title="Modern"
                  description="Hiện đại, nổi bật và phù hợp với nhiều ngành nghề."
                  active={
                    templateKey ===
                    'modern'
                  }
                  onClick={() =>
                    handleChangeTemplate(
                      'modern'
                    )
                  }
                  color="#7c3aed"
                />

                <TemplateCard
                  title="Professional"
                  description="Chuyên nghiệp, rõ ràng và phù hợp môi trường doanh nghiệp."
                  active={
                    templateKey ===
                    'professional'
                  }
                  onClick={() =>
                    handleChangeTemplate(
                      'professional'
                    )
                  }
                  color="#2563eb"
                />

                <TemplateCard
                  title="Minimal"
                  description="Tối giản, dễ đọc và tập trung vào nội dung."
                  active={
                    templateKey ===
                    'minimal'
                  }
                  onClick={() =>
                    handleChangeTemplate(
                      'minimal'
                    )
                  }
                  color="#111827"
                />

              </div>

            </div>
          )}

        </aside>
        )}
        {/* =================================================
            CV PREVIEW
        ================================================= */}

        <section className="hidden lg:block flex-1 min-w-0 h-[calc(100vh-68px)] overflow-auto bg-[#eef0f3]">

          <div className="min-h-full px-6 xl:px-10 py-7">

            <div className="no-print max-w-[820px] mx-auto mb-4 rounded-lg px-4 py-3 text-center text-sm flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
              <Sparkles className="w-4 h-4" />

              <span>
                Nhấp trực tiếp vào nội dung trên CV để chỉnh sửa.
              </span>
            </div>

            {/* A4 */}
            {/* A4 */}
          <div id="cv-print-area">
            {templateKey === 'modern' && (
              <ModernTemplate
                cvData={cvData}
                settings={settings}
                theme={theme}
                updatePersonalInfo={updatePersonalInfo}
                handleAvatarChange={handleAvatarChange}
                addEducation={addEducation}
                updateEducation={updateEducation}
                removeEducation={removeEducation}
                addExperience={addExperience}
                updateExperience={updateExperience}
                removeExperience={removeExperience}
                addProject={addProject}
                updateProject={updateProject}
                removeProject={removeProject}
                addCertificate={addCertificate}
                updateCertificate={updateCertificate}
                removeCertificate={removeCertificate}
                addEmptySkill={addEmptySkill}
                updateSkill={updateSkill}
                removeSkill={removeSkill}
              />
            )}

            {templateKey === 'professional' && (
              <ProfessionalTemplate
                cvData={cvData}
                settings={settings}
                theme={theme}
                updatePersonalInfo={updatePersonalInfo}
                handleAvatarChange={handleAvatarChange}
                addEducation={addEducation}
                updateEducation={updateEducation}
                removeEducation={removeEducation}
                addExperience={addExperience}
                updateExperience={updateExperience}
                removeExperience={removeExperience}
                addProject={addProject}
                updateProject={updateProject}
                removeProject={removeProject}
                addCertificate={addCertificate}
                updateCertificate={updateCertificate}
                removeCertificate={removeCertificate}
                addEmptySkill={addEmptySkill}
                updateSkill={updateSkill}
                removeSkill={removeSkill}
              />
            )}

            {templateKey === 'minimal' && (
              <MinimalTemplate
                cvData={cvData}
                settings={settings}
                theme={theme}
                updatePersonalInfo={updatePersonalInfo}
                handleAvatarChange={handleAvatarChange}
                addEducation={addEducation}
                updateEducation={updateEducation}
                removeEducation={removeEducation}
                addExperience={addExperience}
                updateExperience={updateExperience}
                removeExperience={removeExperience}
                addProject={addProject}
                updateProject={updateProject}
                removeProject={removeProject}
                addCertificate={addCertificate}
                updateCertificate={updateCertificate}
                removeCertificate={removeCertificate}
                addEmptySkill={addEmptySkill}
                updateSkill={updateSkill}
                removeSkill={removeSkill}
              />
            )}
          </div>
            <p className="no-print text-center text-xs text-gray-400 mt-5">
              Bản xem trước CV • Khổ A4
            </p>
            
          </div>

        </section>

      </div>

      {/* =================================================
          LOCAL STYLE
      ================================================= */}

      <style jsx global>{`
        .editor-textarea {
          width: 100%;
          min-height: 90px;
          border: 1px solid hsl(var(--input));
          border-radius: 0.375rem;
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          resize: vertical;
        }

        .editor-textarea:focus {
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }

        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          .no-print {
            display: none !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          main {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          #cv-print-area {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          #cv-print-area > * {
            margin: 0 !important;
            box-shadow: none !important;
          }

          #cv-print-area input,
          #cv-print-area textarea {
            border-color: transparent !important;
            outline: none !important;
            box-shadow: none !important;
          }

          #cv-print-area textarea {
            resize: none !important;
            overflow: hidden !important;
          }
        }
      `}</style>

    </main>
  );
}

// =====================================================
// SIDEBAR BUTTON
// =====================================================

function SidebarButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full min-h-[92px] px-3 py-4 flex flex-col items-center justify-center gap-2 text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-violet-50 text-violet-600'
          : 'text-gray-600 hover:bg-violet-50 hover:text-violet-600'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-violet-600 rounded-r-full" />
      )}

      <div className="transition-colors duration-200">
        {icon}
      </div>

      <span className="text-center">
        {label}
      </span>
    </button>
  );
}
// =====================================================
// PANEL HEADER
// =====================================================

function PanelHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div>

      <div className="flex items-center gap-2">

        {icon}

        <h2 className="text-xl font-bold">
          {title}
        </h2>

      </div>

      <p className="text-sm text-gray-500 mt-1">
        {subtitle}
      </p>

    </div>
  );
}

// =====================================================
// FIELD LABEL
// =====================================================

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">

      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>

      {children}

    </div>
  );
}

// =====================================================
// EDITOR SECTION
// =====================================================

function EditorSection({
  title,
  icon,
  children,
  defaultOpen = false,
  count,
  onAdd,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  count?: number;
  onAdd?: () => void;
}) {
  const [open, setOpen] =
    useState(
      defaultOpen
    );

  return (
    <div className="border-b py-5">

      <div className="flex items-center justify-between gap-3">

        <button
          type="button"
          onClick={() =>
            setOpen(
              !open
            )
          }
          className="flex items-center gap-2 min-w-0 text-left"
        >

          <span className="text-violet-600">
            {icon}
          </span>

          <span className="font-semibold">
            {title}
          </span>

          {typeof count === 'number' &&
            count > 0 && (
              <span className="bg-gray-100 text-gray-500 rounded-full text-xs px-2 py-0.5">
                {count}
              </span>
            )}

          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              open
                ? 'rotate-180'
                : ''
            }`}
          />

        </button>

        {onAdd && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onAdd();

              setOpen(
                true
              );
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Thêm
          </Button>
        )}

      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {children}
        </div>
      )}

    </div>
  );
}

// =====================================================
// ITEM BOX
// =====================================================

function ItemBox({
  title,
  onDelete,
  children,
}: {
  title: string;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl p-4 bg-gray-50/70 space-y-3">

      <div className="flex items-center justify-between">

        <span className="text-sm font-semibold">
          {title}
        </span>

        <button
          type="button"
          onClick={
            onDelete
          }
          className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>

      </div>

      {children}

    </div>
  );
}

// =====================================================
// EMPTY TEXT
// =====================================================

function EmptyText({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-lg border border-dashed p-4 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}

// =====================================================
// ADD SECTION BUTTON
// =====================================================

function AddSectionButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="border rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition"
    >
      {icon}

      <span className="text-sm font-semibold">
        {title}
      </span>
    </button>
  );
}

// =====================================================
// TEMPLATE CARD
// =====================================================

function TemplateCard({
  title,
  description,
  active,
  onClick,
  color,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`w-full border rounded-xl overflow-hidden text-left transition ${
        active
          ? 'ring-2 ring-violet-500'
          : 'hover:border-gray-400'
      }`}
    >

      <div
        className="h-24 p-4 flex items-end"
        style={{
          background:
            `linear-gradient(135deg, ${color} 0%, ${color} 36%, #ffffff 36%, #ffffff 100%)`,
        }}
      >

        <div className="bg-white shadow-sm w-[60%] h-14 rounded-sm ml-auto p-2">

          <div
            className="h-2 w-2/3 rounded"
            style={{
              backgroundColor:
                color,
            }}
          />

          <div className="h-1.5 bg-gray-200 rounded mt-2" />

          <div className="h-1.5 bg-gray-200 rounded mt-1 w-4/5" />

        </div>

      </div>

      <div className="p-4">

        <div className="flex items-center justify-between">

          <h3 className="font-semibold">
            {title}
          </h3>

          {active && (
            <Check className="w-4 h-4 text-green-600" />
          )}

        </div>

        <p className="text-sm text-gray-500 mt-1">
          {description}
        </p>

      </div>

    </button>
  );
}

// =====================================================
// CONTACT ROW
// =====================================================

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">

      <span className="mt-0.5 text-gray-500">
        {icon}
      </span>

      <span className="font-semibold shrink-0">
        {label}:
      </span>

      <span className="break-all">
        {value ||
          'Chưa cập nhật'}
      </span>

    </div>
  );
}

// =====================================================
// CV SECTION
// =====================================================

function CVSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">

      <h2
        className="text-[17px] font-bold pb-1.5 border-b-2"
        style={{
          borderColor:
            color,
          color:
            '#111827',
        }}
      >
        {title}
      </h2>

      <div className="mt-4">
        {children}
      </div>

    </section>
  );
}
// =====================================================
// TIMELINE ITEM
// =====================================================

function TimelineItem({
  date,
  title,
  subtitle,
  description,
  extra,
}: {
  date?: string;
  title: string;
  subtitle?: string;
  description?: string;
  extra?: string;
}) {
  return (
    <div className="grid grid-cols-[155px_1fr] gap-4">

      <div className="text-gray-500 italic">
        {date}
      </div>

      <div>

        <h3 className="font-bold">
          {title}
        </h3>

        {subtitle && (
          <p className="text-gray-600 italic mt-1">
            {subtitle}
          </p>
        )}

        {description && (
          <p className="text-gray-600 mt-1 whitespace-pre-line">
            {description}
          </p>
        )}

        {extra && (
          <p className="text-gray-500 mt-2 text-[0.92em]">
            {extra}
          </p>
        )}

      </div>

    </div>
  );
}

// =====================================================
// PREVIEW PLACEHOLDER
// =====================================================

function PreviewPlaceholder({
  left,
  title,
  subtitle,
  description,
}: {
  left: string;
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[155px_1fr] gap-4 text-gray-400 italic">

      <div>
        {left}
      </div>

      <div>

        <p className="font-semibold">
          {title}
        </p>

        <p className="mt-1">
          {subtitle}
        </p>

        <p className="mt-2">
          {description}
        </p>

      </div>

    </div>
  );
}

// =====================================================
// MODERN TEMPLATE
// =====================================================
function SidebarTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h2 className="text-[14px] font-bold tracking-[0.12em] border-b border-white/30 pb-2">
      {title}
    </h2>
  );
}

function ProfessionalSection({
  title,
  color,
  children,
  onAdd,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <section className="mt-7">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[16px] font-bold tracking-wide" style={{ color }}>
          {title}
        </h2>

        {onAdd && (
          <button type="button" onClick={onAdd} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50" title={`Thêm ${title.toLowerCase()}`}>
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {children}
    </section>
  );
}

function ModernSection({
  title,
  color,
  children,
  onAdd,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: color }} />

        <h2 className="font-bold text-[17px] flex-1">
          {title}
        </h2>

        {onAdd && (
          <button type="button" onClick={onAdd} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {children}
    </section>
  );
}

function ModernSideSection({
  title,
  color,
  children,
  onAdd,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-[14px] font-bold tracking-wide" style={{ color }}>
          {title}
        </h2>

        {onAdd && (
          <button type="button" onClick={onAdd} className="w-6 h-6 rounded-full border flex items-center justify-center bg-white/60 hover:bg-white">
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {children}
    </section>
  );
}

function MinimalSection({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  return (
    <section className="mt-7">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[15px] font-bold tracking-[0.08em]">
          {title}
        </h2>

        <div className="h-px bg-gray-300 flex-1" />

        {onAdd && (
          <button type="button" onClick={onAdd} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-50">
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>

      {children}
    </section>
  );
}

function EmptyDirectAdd({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="no-print w-full rounded-lg border border-dashed border-gray-300 px-4 py-3 text-left text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition">
      {text}
    </button>
  );
}

function DeleteDirectButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="no-print absolute right-0 top-0 z-10 w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition" title="Xóa">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function ModernDarkSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="shrink-0 rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-bold text-white">
          {title}
        </h2>

        <div className="h-px flex-1 bg-white/20" />
      </div>

      {children}
    </section>
  );
}

function ModernPillSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="shrink-0 rounded-full px-4 py-1.5 text-[13px] font-bold text-white" style={{ backgroundColor: color }}>
          {title}
        </h2>

        <div className="h-px flex-1 opacity-60" style={{ backgroundColor: color }} />
      </div>

      {children}
    </section>
  );
}

function ModernDarkAdd({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="no-print mt-2 text-[11px] text-white/50 hover:text-white/90 transition">
      {text}
    </button>
  );
}
function ModernTemplate({
  cvData,
  settings,
  theme,
  updatePersonalInfo,
  handleAvatarChange,
  addEducation,
  updateEducation,
  removeEducation,
  addExperience,
  updateExperience,
  removeExperience,
  addProject,
  updateProject,
  removeProject,
  addCertificate,
  updateCertificate,
  removeCertificate,
  addEmptySkill,
  updateSkill,
  removeSkill,
}: CVTemplateProps) {
  return (
    <div className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)] mx-auto w-[794px] min-h-[1123px] overflow-hidden" style={{ fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}>
      <div className="grid grid-cols-[295px_1fr] min-h-[1123px]">

        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="px-7 py-8 text-white" style={{ backgroundColor: theme.main }}>

          {/* AVATAR */}
          <label className="relative block w-[185px] h-[185px] mx-auto rounded-full border-[7px] border-white/25 overflow-hidden cursor-pointer group bg-white">
            {cvData.personalInfo.avatar ? (
              <img src={cvData.personalInfo.avatar} alt="Ảnh cá nhân" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <UserRound className="w-24 h-24 text-gray-400" />
              </div>
            )}

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {cvData.personalInfo.avatar ? 'Đổi ảnh' : 'Tải ảnh'}
              </span>
            </div>

            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} className="hidden" />
          </label>

          {/* NAME */}
          <div className="mt-5 text-center">
            <InlineText value={cvData.personalInfo.fullName} placeholder="HỌ VÀ TÊN" onChange={(value) => updatePersonalInfo('fullName', value)} className="text-center text-white text-[25px] font-bold placeholder:text-white/50" />

            <InlineText value={cvData.personalInfo.jobTitle} placeholder="Vị trí ứng tuyển" onChange={(value) => updatePersonalInfo('jobTitle', value)} className="text-center text-white/65 italic text-[15px] mt-2 placeholder:text-white/40" />
          </div>

          {/* CONTACT */}
          <div className="mt-7 space-y-2.5">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 shrink-0 text-white" />
              <InlineText value={cvData.personalInfo.phone} placeholder="0123 456 789" onChange={(value) => updatePersonalInfo('phone', value)} className="text-white/80 text-[12px] italic placeholder:text-white/40" />
            </div>

            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0 text-white" />
              <InlineText value={cvData.personalInfo.email} placeholder="example@gmail.com" onChange={(value) => updatePersonalInfo('email', value)} className="text-white/80 text-[12px] placeholder:text-white/40" />
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-1 text-white" />
              <InlineText value={cvData.personalInfo.address} placeholder="Quận A, thành phố Hà Nội" onChange={(value) => updatePersonalInfo('address', value)} className="text-white/70 text-[12px] italic placeholder:text-white/40" />
            </div>
          </div>

          {/* EDUCATION */}
          <ModernDarkSection title="Học vấn">
            {cvData.education.length === 0 ? (
              <ModernDarkAdd text="+ Thêm học vấn" onClick={addEducation} />
            ) : (
              <div className="space-y-5">
                {cvData.education.map((item, index) => (
                  <div key={index} className="group relative">
                    <button type="button" onClick={() => removeEducation(index)} className="no-print absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-white/70 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <InlineText value={item.major} placeholder="Ngành học / Môn học" onChange={(value) => updateEducation(index, 'major', value)} className="text-white/80 text-[12px] italic font-semibold pr-5 placeholder:text-white/40" />

                    <div className="flex items-center gap-1 mt-1 text-[11px] text-white/65 italic">
                      <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateEducation(index, 'startDate', value)} className="text-white/65 placeholder:text-white/35" />
                      <span>–</span>
                      <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateEducation(index, 'endDate', value)} className="text-white/65 placeholder:text-white/35" />
                    </div>

                    <InlineText value={item.school} placeholder="Tên trường học" onChange={(value) => updateEducation(index, 'school', value)} className="text-white/75 text-[12px] italic mt-1 placeholder:text-white/40" />

                    <InlineText multiline value={item.description} placeholder="Mô tả quá trình học tập hoặc thành tích..." onChange={(value) => updateEducation(index, 'description', value)} className="text-white/60 text-[11px] italic mt-1 min-h-[35px] placeholder:text-white/30" />
                  </div>
                ))}

                <ModernDarkAdd text="+ Thêm học vấn" onClick={addEducation} />
              </div>
            )}
          </ModernDarkSection>

          {/* SKILLS */}
          <ModernDarkSection title="Kỹ năng">
            {cvData.skills.length === 0 ? (
              <ModernDarkAdd text="+ Thêm kỹ năng" onClick={addEmptySkill} />
            ) : (
              <div className="space-y-2">
                {cvData.skills.map((skill, index) => (
                  <div key={index} className="group flex items-center gap-2">
                    <input value={skill} onChange={(e) => updateSkill(index, e.target.value)} placeholder="Tên kỹ năng" className="flex-1 min-w-0 bg-transparent outline-none border-b border-transparent hover:border-white/30 focus:border-white/50 py-0.5 text-[12px] italic text-white/75 placeholder:text-white/40" />

                    <button type="button" onClick={() => removeSkill(index)} className="no-print opacity-0 group-hover:opacity-100 text-white/60 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <ModernDarkAdd text="+ Thêm kỹ năng" onClick={addEmptySkill} />
              </div>
            )}
          </ModernDarkSection>
        </aside>

        {/* ================= RIGHT CONTENT ================= */}
        <main className="px-8 py-8">

          {/* SUMMARY */}
          <ModernPillSection title="Mục tiêu nghề nghiệp" color={theme.main}>
            <InlineText multiline value={cvData.personalInfo.summary} placeholder="Mục tiêu nghề nghiệp của bạn, bao gồm mục tiêu ngắn hạn và dài hạn..." onChange={(value) => updatePersonalInfo('summary', value)} className="text-[12px] italic text-gray-500 min-h-[45px]" />
          </ModernPillSection>

          {/* EXPERIENCE */}
          <ModernPillSection title="Kinh nghiệm làm việc" color={theme.main}>
            {cvData.experience.length === 0 ? (
              <EmptyDirectAdd text="+ Thêm kinh nghiệm làm việc" onClick={addExperience} />
            ) : (
              <div className="space-y-5">
                {cvData.experience.map((item, index) => (
                  <div key={index} className="group relative">
                    <DeleteDirectButton onClick={() => removeExperience(index)} />

                    <div className="grid grid-cols-[1fr_145px] gap-4 pr-8">
                      <InlineText value={item.position} placeholder="Vị trí công việc" onChange={(value) => updateExperience(index, 'position', value)} className="text-[12px] italic text-gray-500" />

                      <div className="flex items-center justify-end gap-1 text-[11px] italic text-gray-400">
                        <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateExperience(index, 'startDate', value)} />
                        <span>–</span>
                        <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateExperience(index, 'endDate', value)} />
                      </div>
                    </div>

                    <InlineText value={item.company} placeholder="Tên công ty" onChange={(value) => updateExperience(index, 'company', value)} className="text-[12px] italic text-gray-500 mt-1 pr-8" />

                    <InlineText multiline value={item.description} placeholder="Mô tả kinh nghiệm làm việc của bạn" onChange={(value) => updateExperience(index, 'description', value)} className="text-[11px] italic text-gray-400 mt-1 min-h-[34px]" />
                  </div>
                ))}

                <button type="button" onClick={addExperience} className="no-print text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                  + Thêm kinh nghiệm
                </button>
              </div>
            )}
          </ModernPillSection>

          {/* CERTIFICATES */}
          <ModernPillSection title="Chứng chỉ" color={theme.main}>
            {cvData.certificates.length === 0 ? (
              <EmptyDirectAdd text="+ Thêm chứng chỉ" onClick={addCertificate} />
            ) : (
              <div className="space-y-3">
                {cvData.certificates.map((item, index) => (
                  <div key={index} className="group relative grid grid-cols-[100px_1fr] gap-4">
                    <DeleteDirectButton onClick={() => removeCertificate(index)} />

                    <InlineText value={item.date} placeholder="Thời gian" onChange={(value) => updateCertificate(index, 'date', value)} className="text-[11px] italic text-gray-400" />

                    <div className="pr-8">
                      <InlineText value={item.name} placeholder="Tên chứng chỉ" onChange={(value) => updateCertificate(index, 'name', value)} className="text-[12px] italic text-gray-500" />

                      <InlineText value={item.organization} placeholder="Tổ chức cấp" onChange={(value) => updateCertificate(index, 'organization', value)} className="text-[11px] text-gray-400 mt-1" />

                      <InlineText multiline value={item.description} placeholder="Mô tả chứng chỉ..." onChange={(value) => updateCertificate(index, 'description', value)} className="text-[11px] text-gray-400 mt-1 min-h-[28px]" />
                    </div>
                  </div>
                ))}

                <button type="button" onClick={addCertificate} className="no-print text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                  + Thêm chứng chỉ
                </button>
              </div>
            )}
          </ModernPillSection>

          {/* PROJECTS */}
          <ModernPillSection title="Dự án" color={theme.main}>
            {cvData.projects.length === 0 ? (
              <EmptyDirectAdd text="+ Thêm dự án" onClick={addProject} />
            ) : (
              <div className="space-y-5">
                {cvData.projects.map((item, index) => (
                  <div key={index} className="group relative">
                    <DeleteDirectButton onClick={() => removeProject(index)} />

                    <div className="grid grid-cols-[1fr_145px] gap-4 pr-8">
                      <InlineText value={item.role} placeholder="Vị trí của bạn trong dự án" onChange={(value) => updateProject(index, 'role', value)} className="text-[12px] italic text-gray-500" />

                      <div className="flex justify-end gap-1 text-[11px] italic text-gray-400">
                        <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateProject(index, 'startDate', value)} />
                        <span>–</span>
                        <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateProject(index, 'endDate', value)} />
                      </div>
                    </div>

                    <InlineText value={item.name} placeholder="Tên dự án" onChange={(value) => updateProject(index, 'name', value)} className="text-[12px] italic text-gray-500 mt-1 font-medium pr-8" />

                    <InlineText multiline value={item.description} placeholder="Mô tả ngắn gọn về dự án, mục tiêu, vai trò và kết quả..." onChange={(value) => updateProject(index, 'description', value)} className="text-[11px] italic text-gray-400 mt-1 min-h-[45px]" />

                    <input value={item.technologies?.join(', ') || ''} onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="Công nghệ sử dụng" className="w-full bg-transparent outline-none border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-1 py-1 mt-1 text-[11px] italic text-gray-400" />
                  </div>
                ))}

                <button type="button" onClick={addProject} className="no-print text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                  + Thêm dự án
                </button>
              </div>
            )}
          </ModernPillSection>
        </main>
      </div>
    </div>
  );
}
// =====================================================
// PROFESSIONAL TEMPLATE
// =====================================================

function ProfessionalContactRow({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-black/15">
      <div className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0" style={{ color, borderColor: color }}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

function ProfessionalSideSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[17px] font-bold shrink-0" style={{ color }}>
          {title}
        </h2>

        <div className="h-px flex-1" style={{ backgroundColor: color, opacity: 0.35 }} />
      </div>

      {children}
    </section>
  );
}

function ProfessionalMainSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[18px] font-bold shrink-0 text-gray-800">
          {title}
        </h2>

        <div className="h-px flex-1" style={{ backgroundColor: color, opacity: 0.35 }} />
      </div>

      {children}
    </section>
  );
}

function ProfessionalDatePill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-full px-3 py-1 min-w-[105px]" style={{ backgroundColor: color }}>
      {children}
    </div>
  );
}
function ProfessionalTemplate({
  cvData,
  settings,
  theme,
  updatePersonalInfo,
  handleAvatarChange,
  addEducation,
  updateEducation,
  removeEducation,
  addExperience,
  updateExperience,
  removeExperience,
  addProject,
  updateProject,
  removeProject,
  addCertificate,
  updateCertificate,
  removeCertificate,
  addEmptySkill,
  updateSkill,
  removeSkill,
}: CVTemplateProps) {
  return (
    <div className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)] mx-auto w-[794px] min-h-[1123px] overflow-hidden text-gray-700" style={{ fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}>

      <div className="grid grid-cols-[38%_62%] min-h-[1123px]">

        {/* ================================================= */}
        {/* LEFT COLUMN                                       */}
        {/* ================================================= */}
        <aside className="border-r border-gray-200">

          {/* LEFT TOP */}
          <div className="px-7 pt-8 pb-7" style={{ backgroundColor: theme.light }}>

            {/* AVATAR */}
            <label className="relative block w-[170px] h-[170px] mx-auto rounded-full overflow-hidden bg-white border-[7px] cursor-pointer group" style={{ borderColor: theme.border }}>
              {cvData.personalInfo.avatar ? (
                <img src={cvData.personalInfo.avatar} alt="Ảnh cá nhân" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <UserRound className="w-24 h-24 text-gray-400" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {cvData.personalInfo.avatar ? 'Đổi ảnh' : 'Tải ảnh'}
                </span>
              </div>

              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} className="hidden" />
            </label>

            {/* CONTACT */}
            <div className="mt-7 border-t" style={{ borderColor: theme.border }}>

              <ProfessionalContactRow icon={<Phone className="w-4 h-4" />} color={theme.main}>
                <InlineText value={cvData.personalInfo.phone} placeholder="0123 456 789" onChange={(value) => updatePersonalInfo('phone', value)} className="text-[12px]" />
              </ProfessionalContactRow>

              <ProfessionalContactRow icon={<Mail className="w-4 h-4" />} color={theme.main}>
                <InlineText value={cvData.personalInfo.email} placeholder="example@gmail.com" onChange={(value) => updatePersonalInfo('email', value)} className="text-[12px]" />
              </ProfessionalContactRow>

              <ProfessionalContactRow icon={<MapPin className="w-4 h-4" />} color={theme.main}>
                <InlineText value={cvData.personalInfo.address} placeholder="Quận A, thành phố Hà Nội" onChange={(value) => updatePersonalInfo('address', value)} className="text-[12px]" />
              </ProfessionalContactRow>

            </div>
          </div>

          {/* LEFT WHITE CONTENT */}
          <div className="px-7 py-6">

            {/* SKILLS */}
            <ProfessionalSideSection title="Kỹ năng" color={theme.main}>
              {cvData.skills.length === 0 ? (
                <EmptyDirectAdd text="+ Thêm kỹ năng" onClick={addEmptySkill} />
              ) : (
                <div className="space-y-3">
                  {cvData.skills.map((skill, index) => (
                    <div key={index} className="group flex items-center gap-2">

                      <span className="text-[14px] shrink-0" style={{ color: theme.main }}>
                        ✦
                      </span>

                      <input value={skill} onChange={(e) => updateSkill(index, e.target.value)} placeholder="Tên kỹ năng" className="flex-1 min-w-0 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-gray-400 py-1 text-[12px]" />

                      <button type="button" onClick={() => removeSkill(index)} className="opacity-0 group-hover:opacity-100 text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button type="button" onClick={addEmptySkill} className="text-[11px] opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                    + Thêm kỹ năng
                  </button>
                </div>
              )}
            </ProfessionalSideSection>

            {/* CERTIFICATES */}
            <ProfessionalSideSection title="Chứng chỉ" color={theme.main}>
              {cvData.certificates.length === 0 ? (
                <EmptyDirectAdd text="+ Thêm chứng chỉ" onClick={addCertificate} />
              ) : (
                <div className="space-y-4">
                  {cvData.certificates.map((item, index) => (
                    <div key={index} className="group relative grid grid-cols-[65px_1fr] gap-3">
                      <DeleteDirectButton onClick={() => removeCertificate(index)} />

                      <InlineText value={item.date} placeholder="Thời gian" onChange={(value) => updateCertificate(index, 'date', value)} className="text-[11px] text-gray-400" />

                      <div className="pr-6">
                        <InlineText value={item.name} placeholder="Tên chứng chỉ" onChange={(value) => updateCertificate(index, 'name', value)} className="text-[12px] font-medium" />

                        <InlineText value={item.organization} placeholder="Tổ chức cấp" onChange={(value) => updateCertificate(index, 'organization', value)} className="text-[11px] text-gray-400 mt-1" />
                      </div>
                    </div>
                  ))}

                  <button type="button" onClick={addCertificate} className="text-[11px] opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                    + Thêm chứng chỉ
                  </button>
                </div>
              )}
            </ProfessionalSideSection>

          </div>
        </aside>

        {/* ================================================= */}
        {/* RIGHT COLUMN                                      */}
        {/* ================================================= */}
        <main>

          {/* RIGHT HEADER */}
          <div className="px-8 pt-10 pb-8 text-white min-h-[205px]" style={{ backgroundColor: theme.main }}>

            <InlineText value={cvData.personalInfo.fullName} placeholder="HỌ VÀ TÊN" onChange={(value) => updatePersonalInfo('fullName', value)} className="text-white text-[29px] font-bold placeholder:text-white/50" />

            <InlineText value={cvData.personalInfo.jobTitle} placeholder="VỊ TRÍ ỨNG TUYỂN" onChange={(value) => updatePersonalInfo('jobTitle', value)} className="text-white/70 text-[12px] uppercase mt-4 placeholder:text-white/40" />

            <div className="h-px bg-white/25 my-3" />

            <InlineText multiline value={cvData.personalInfo.summary} placeholder="Mục tiêu nghề nghiệp của bạn, bao gồm mục tiêu ngắn hạn và dài hạn..." onChange={(value) => updatePersonalInfo('summary', value)} className="text-white/60 text-[11px] min-h-[42px] placeholder:text-white/35" />

          </div>

          {/* RIGHT BODY */}
          <div className="px-8 py-6">

            {/* EXPERIENCE */}
            <ProfessionalMainSection title="Kinh nghiệm làm việc" color={theme.main}>
              {cvData.experience.length === 0 ? (
                <EmptyDirectAdd text="+ Thêm kinh nghiệm làm việc" onClick={addExperience} />
              ) : (
                <div className="space-y-6">
                  {cvData.experience.map((item, index) => (
                    <div key={index} className="group relative">
                      <DeleteDirectButton onClick={() => removeExperience(index)} />

                      <div className="grid grid-cols-[1fr_auto] gap-4 items-start pr-8">

                        <div>
                          <InlineText value={item.company} placeholder="Tên công ty" onChange={(value) => updateExperience(index, 'company', value)} className="text-[12px] font-medium text-gray-500" />
                        </div>

                        <ProfessionalDatePill color={theme.main}>
                          <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateExperience(index, 'startDate', value)} className="text-white text-[10px] text-center" />

                          <span className="text-white/70 text-[10px]">-</span>

                          <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateExperience(index, 'endDate', value)} className="text-white text-[10px] text-center" />
                        </ProfessionalDatePill>

                      </div>

                      <InlineText value={item.position} placeholder="Vị trí công việc" onChange={(value) => updateExperience(index, 'position', value)} className="text-[11px] text-gray-400 mt-1" />

                      <InlineText multiline value={item.description} placeholder="Mô tả kinh nghiệm làm việc của bạn" onChange={(value) => updateExperience(index, 'description', value)} className="text-[11px] text-gray-400 mt-1 min-h-[35px]" />
                    </div>
                  ))}

                  <button type="button" onClick={addExperience} className="text-[11px] opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                    + Thêm kinh nghiệm
                  </button>
                </div>
              )}
            </ProfessionalMainSection>

            {/* EDUCATION */}
            <ProfessionalMainSection title="Học vấn" color={theme.main}>
              {cvData.education.length === 0 ? (
                <EmptyDirectAdd text="+ Thêm học vấn" onClick={addEducation} />
              ) : (
                <div className="space-y-5">
                  {cvData.education.map((item, index) => (
                    <div key={index} className="group relative">
                      <DeleteDirectButton onClick={() => removeEducation(index)} />

                      <div className="grid grid-cols-[1fr_auto] gap-4 items-start pr-8">

                        <InlineText value={item.school} placeholder="Tên trường học" onChange={(value) => updateEducation(index, 'school', value)} className="text-[12px] font-medium text-gray-500" />

                        <ProfessionalDatePill color={theme.main}>
                          <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateEducation(index, 'startDate', value)} className="text-white text-[10px] text-center" />

                          <span className="text-white/70 text-[10px]">-</span>

                          <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateEducation(index, 'endDate', value)} className="text-white text-[10px] text-center" />
                        </ProfessionalDatePill>

                      </div>

                      <InlineText value={item.major} placeholder="Ngành học / Môn học" onChange={(value) => updateEducation(index, 'major', value)} className="text-[11px] text-gray-400 mt-1" />

                      <InlineText multiline value={item.description} placeholder="Mô tả quá trình học tập hoặc thành tích của bạn" onChange={(value) => updateEducation(index, 'description', value)} className="text-[11px] text-gray-400 mt-1 min-h-[32px]" />
                    </div>
                  ))}

                  <button type="button" onClick={addEducation} className="no-print text-[11px] opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                    + Thêm học vấn
                  </button>
                </div>
              )}
            </ProfessionalMainSection>

            {/* PROJECTS */}
            <ProfessionalMainSection title="Dự án" color={theme.main}>
              {cvData.projects.length === 0 ? (
                <EmptyDirectAdd text="+ Thêm dự án" onClick={addProject} />
              ) : (
                <div className="space-y-5">
                  {cvData.projects.map((item, index) => (
                    <div key={index} className="group relative">
                      <DeleteDirectButton onClick={() => removeProject(index)} />

                      <div className="grid grid-cols-[1fr_auto] gap-4 items-start pr-8">

                        <InlineText value={item.name} placeholder="Tên dự án" onChange={(value) => updateProject(index, 'name', value)} className="text-[12px] font-medium text-gray-500" />

                        <ProfessionalDatePill color={theme.main}>
                          <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateProject(index, 'startDate', value)} className="text-white text-[10px] text-center" />

                          <span className="text-white/70 text-[10px]">-</span>

                          <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateProject(index, 'endDate', value)} className="text-white text-[10px] text-center" />
                        </ProfessionalDatePill>

                      </div>

                      <InlineText value={item.role} placeholder="Vị trí của bạn" onChange={(value) => updateProject(index, 'role', value)} className="text-[11px] text-gray-400 mt-1" />

                      <InlineText multiline value={item.description} placeholder="Mô tả ngắn gọn về dự án, mục tiêu, vai trò và kết quả..." onChange={(value) => updateProject(index, 'description', value)} className="text-[11px] text-gray-400 mt-1 min-h-[45px]" />

                      <input value={item.technologies?.join(', ') || ''} onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="Công nghệ sử dụng" className="w-full bg-transparent outline-none border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-1 py-1 mt-1 text-[10px] text-gray-400" />

                    </div>
                  ))}

                  <button type="button" onClick={addProject} className="no-print text-[11px] opacity-60 hover:opacity-100" style={{ color: theme.main }}>
                    + Thêm dự án
                  </button>
                </div>
              )}
            </ProfessionalMainSection>

          </div>
        </main>
      </div>
    </div>
  );
}
// =====================================================
// MINIMAL TEMPLATE
// =====================================================
function MinimalLineSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2">
        <h2 className="text-[14px] font-bold uppercase text-gray-900">{title}</h2>
        <div className="h-[1px] w-full mt-1" style={{ backgroundColor: color }} />
      </div>

      {children}
    </section>
  );
}
function MinimalTemplate({
  cvData,
  settings,
  theme,
  updatePersonalInfo,
  handleAvatarChange,
  addEducation,
  updateEducation,
  removeEducation,
  addExperience,
  updateExperience,
  removeExperience,
  addProject,
  updateProject,
  removeProject,
  addCertificate,
  updateCertificate,
  removeCertificate,
  addEmptySkill,
  updateSkill,
  removeSkill,
}: CVTemplateProps) {
  return (
    <div className="bg-white shadow-[0_8px_30px_rgba(0,0,0,0.10)] mx-auto w-[794px] min-h-[1123px] px-7 py-7 text-gray-800" style={{ fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }}>
      
      {/* ================= HEADER ================= */}
      <header className="flex items-start gap-5">
        <label className="relative w-[130px] h-[150px] shrink-0 overflow-hidden bg-gray-100 cursor-pointer group">
          {cvData.personalInfo.avatar ? (
            <img src={cvData.personalInfo.avatar} alt="Ảnh cá nhân" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <UserRound className="w-16 h-16 text-gray-400" />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
            <span className="text-white text-xs font-semibold">
              {cvData.personalInfo.avatar ? 'Đổi ảnh' : 'Tải ảnh'}
            </span>
          </div>

          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} className="hidden" />
        </label>

        <div className="flex-1 min-w-0 pt-1">
          <InlineText value={cvData.personalInfo.fullName} placeholder="HỌ VÀ TÊN" onChange={(value) => updatePersonalInfo('fullName', value)} className="text-[26px] font-bold text-gray-900" />

          <InlineText value={cvData.personalInfo.jobTitle} placeholder="Vị trí ứng tuyển" onChange={(value) => updatePersonalInfo('jobTitle', value)} className="text-[14px] italic text-gray-500 mt-1" />

          <div className="mt-3 space-y-1 text-[13px]">
            <div className="flex items-start gap-2">
              <span className="font-semibold w-[95px] shrink-0">Số điện thoại:</span>
              <InlineText value={cvData.personalInfo.phone} placeholder="0123 456 789" onChange={(value) => updatePersonalInfo('phone', value)} className="flex-1" />
            </div>

            <div className="flex items-start gap-2">
              <span className="font-semibold w-[95px] shrink-0">Email:</span>
              <InlineText value={cvData.personalInfo.email} placeholder="example@gmail.com" onChange={(value) => updatePersonalInfo('email', value)} className="flex-1" />
            </div>

            <div className="flex items-start gap-2">
              <span className="font-semibold w-[95px] shrink-0">Địa chỉ:</span>
              <InlineText value={cvData.personalInfo.address} placeholder="Quận A, Thành phố Hà Nội" onChange={(value) => updatePersonalInfo('address', value)} className="flex-1" />
            </div>
          </div>
        </div>
      </header>

      {/* ================= SUMMARY ================= */}
      <MinimalLineSection title="MỤC TIÊU NGHỀ NGHIỆP" color={theme.main}>
        <InlineText multiline value={cvData.personalInfo.summary} placeholder="Mục tiêu nghề nghiệp của bạn, bao gồm mục tiêu ngắn hạn và dài hạn..." onChange={(value) => updatePersonalInfo('summary', value)} className="text-[13px] text-gray-600 italic min-h-[48px]" />
      </MinimalLineSection>

      {/* ================= EDUCATION ================= */}
      <MinimalLineSection title="HỌC VẤN" color={theme.main}>
        {cvData.education.length === 0 ? (
          <EmptyDirectAdd text="+ Thêm học vấn" onClick={addEducation} />
        ) : (
          <div>
            {cvData.education.map((item, index) => (
              <div key={index} className="group relative grid grid-cols-[135px_1fr] gap-4 py-3 border-b border-gray-100 last:border-b-0">
                <DeleteDirectButton onClick={() => removeEducation(index)} />

                <div className="flex gap-1 text-[12px] italic text-gray-500">
                  <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateEducation(index, 'startDate', value)} />
                  <span>-</span>
                  <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateEducation(index, 'endDate', value)} />
                </div>

                <div className="pr-8">
                  <InlineText value={item.school} placeholder="Tên trường học" onChange={(value) => updateEducation(index, 'school', value)} className="font-semibold text-[13px]" />
                  <InlineText value={item.major} placeholder="Ngành học / Môn học" onChange={(value) => updateEducation(index, 'major', value)} className="text-[12px] italic text-gray-500 mt-1" />
                  <InlineText multiline value={item.description} placeholder="Mô tả quá trình học tập hoặc thành tích của bạn" onChange={(value) => updateEducation(index, 'description', value)} className="text-[12px] text-gray-500 mt-1 min-h-[32px]" />
                </div>
              </div>
            ))}

            <button type="button" onClick={addEducation} className="mt-2 text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
              + Thêm học vấn
            </button>
          </div>
        )}
      </MinimalLineSection>

      {/* ================= EXPERIENCE ================= */}
      <MinimalLineSection title="KINH NGHIỆM LÀM VIỆC" color={theme.main}>
        {cvData.experience.length === 0 ? (
          <EmptyDirectAdd text="+ Thêm kinh nghiệm làm việc" onClick={addExperience} />
        ) : (
          <div>
            {cvData.experience.map((item, index) => (
              <div key={index} className="group relative grid grid-cols-[135px_1fr] gap-4 py-3 border-b border-gray-100 last:border-b-0">
                <DeleteDirectButton onClick={() => removeExperience(index)} />

                <div className="flex gap-1 text-[12px] italic text-gray-500">
                  <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateExperience(index, 'startDate', value)} />
                  <span>-</span>
                  <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateExperience(index, 'endDate', value)} />
                </div>

                <div className="pr-8">
                  <InlineText value={item.company} placeholder="Tên công ty" onChange={(value) => updateExperience(index, 'company', value)} className="font-semibold text-[13px]" />
                  <InlineText value={item.position} placeholder="Vị trí công việc" onChange={(value) => updateExperience(index, 'position', value)} className="text-[12px] italic text-gray-500 mt-1" />
                  <InlineText multiline value={item.description} placeholder="Mô tả kinh nghiệm làm việc của bạn" onChange={(value) => updateExperience(index, 'description', value)} className="text-[12px] text-gray-500 mt-1 min-h-[35px]" />
                </div>
              </div>
            ))}

            <button type="button" onClick={addExperience} className="mt-2 text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
              + Thêm kinh nghiệm
            </button>
          </div>
        )}
      </MinimalLineSection>

      {/* ================= PROJECT ================= */}
      <MinimalLineSection title="DỰ ÁN" color={theme.main}>
        {cvData.projects.length === 0 ? (
          <EmptyDirectAdd text="+ Thêm dự án" onClick={addProject} />
        ) : (
          <div>
            {cvData.projects.map((item, index) => (
              <div key={index} className="group relative grid grid-cols-[135px_1fr] gap-4 py-3 border-b border-gray-100 last:border-b-0">
                <DeleteDirectButton onClick={() => removeProject(index)} />

                <div className="flex gap-1 text-[12px] italic text-gray-500">
                  <InlineText value={item.startDate} placeholder="Bắt đầu" onChange={(value) => updateProject(index, 'startDate', value)} />
                  <span>-</span>
                  <InlineText value={item.endDate} placeholder="Kết thúc" onChange={(value) => updateProject(index, 'endDate', value)} />
                </div>

                <div className="pr-8">
                  <InlineText value={item.name} placeholder="Tên dự án" onChange={(value) => updateProject(index, 'name', value)} className="font-semibold text-[13px]" />

                  <InlineText value={item.role} placeholder="Vai trò của bạn" onChange={(value) => updateProject(index, 'role', value)} className="text-[12px] italic text-gray-500 mt-1" />

                  <InlineText multiline value={item.description} placeholder="Mô tả dự án, nhiệm vụ và kết quả..." onChange={(value) => updateProject(index, 'description', value)} className="text-[12px] text-gray-500 mt-1 min-h-[35px]" />

                  <input value={item.technologies?.join(', ') || ''} onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="Công nghệ / kỹ năng sử dụng" className="w-full bg-transparent outline-none border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-1 py-1 mt-1 text-[12px] text-gray-500" />
                </div>
              </div>
            ))}

            <button type="button" onClick={addProject} className="no-print mt-2 text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
              + Thêm dự án
            </button>
          </div>
        )}
      </MinimalLineSection>

      {/* ================= CERTIFICATES ================= */}
      <MinimalLineSection title="CHỨNG CHỈ" color={theme.main}>
        {cvData.certificates.length === 0 ? (
          <EmptyDirectAdd text="+ Thêm chứng chỉ" onClick={addCertificate} />
        ) : (
          <div>
            {cvData.certificates.map((item, index) => (
              <div key={index} className="group relative grid grid-cols-[135px_1fr] gap-4 py-2 border-b border-gray-100 last:border-b-0">
                <DeleteDirectButton onClick={() => removeCertificate(index)} />

                <InlineText value={item.date} placeholder="Thời gian" onChange={(value) => updateCertificate(index, 'date', value)} className="text-[12px] italic text-gray-500" />

                <div className="pr-8">
                  <InlineText value={item.name} placeholder="Tên chứng chỉ" onChange={(value) => updateCertificate(index, 'name', value)} className="font-semibold text-[13px]" />

                  <InlineText value={item.organization} placeholder="Tổ chức cấp" onChange={(value) => updateCertificate(index, 'organization', value)} className="text-[12px] text-gray-500 mt-1" />

                  <InlineText multiline value={item.description} placeholder="Thông tin bổ sung" onChange={(value) => updateCertificate(index, 'description', value)} className="text-[12px] text-gray-500 mt-1 min-h-[28px]" />
                </div>
              </div>
            ))}

            <button type="button" onClick={addCertificate} className="no-print mt-2 text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
              + Thêm chứng chỉ
            </button>
          </div>
        )}
      </MinimalLineSection>

      {/* ================= SKILLS ================= */}
      <MinimalLineSection title="KỸ NĂNG" color={theme.main}>
        {cvData.skills.length === 0 ? (
          <EmptyDirectAdd text="+ Thêm kỹ năng" onClick={addEmptySkill} />
        ) : (
          <div>
            <div className="space-y-1">
              {cvData.skills.map((skill, index) => (
                <div key={index} className="group relative grid grid-cols-[135px_1fr] gap-4 py-1">
                  <span className="text-[12px] italic text-gray-500">
                    Kỹ năng
                  </span>

                  <div className="flex items-center gap-2 pr-8">
                    <input value={skill} onChange={(e) => updateSkill(index, e.target.value)} placeholder="Tên kỹ năng" className="flex-1 bg-transparent outline-none border border-transparent hover:border-gray-200 focus:border-gray-300 rounded px-1 py-1 text-[12px]" />

                    <button type="button" onClick={() => removeSkill(index)} className="opacity-0 group-hover:opacity-100 text-red-500 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addEmptySkill} className="no-print mt-2 text-xs font-medium opacity-60 hover:opacity-100" style={{ color: theme.main }}>
              + Thêm kỹ năng
            </button>
          </div>
        )}
      </MinimalLineSection>
    </div>
  );
}
function MinimalItem({
  date,
  title,
  subtitle,
  description,
  extra,
}: {
  date?: string;
  title: string;
  subtitle?: string;
  description?: string;
  extra?: string;
}) {
  return (
    <div>
      <div className="flex justify-between gap-6">
        <div>
          <h3 className="font-semibold">
            {title}
          </h3>

          {subtitle && (
            <p className="text-gray-600 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {date && (
          <span className="text-gray-500 text-[0.88em] whitespace-nowrap">
            {date}
          </span>
        )}
      </div>

      {description && (
        <p className="text-gray-600 mt-2 whitespace-pre-line">
          {description}
        </p>
      )}

      {extra && (
        <p className="text-gray-500 mt-2 text-[0.9em]">
          {extra}
        </p>
      )}
    </div>
  );
}

type InlineTextProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  multiline?: boolean;
};

function InlineText({
  value,
  placeholder,
  onChange,
  className = '',
  multiline = false,
}: InlineTextProps) {
  const resizeTextarea = (
    element: HTMLTextAreaElement
  ) => {
    element.style.height = '0px';
    element.style.height = `${element.scrollHeight}px`;
  };

  if (multiline) {
    return (
      <textarea
        value={value || ''}
        placeholder={placeholder}
        rows={1}
        ref={(element) => {
          if (element) {
            resizeTextarea(element);
          }
        }}
        onChange={(e) => {
          onChange(e.target.value);
          resizeTextarea(e.currentTarget);
        }}
        onInput={(e) => {
          resizeTextarea(e.currentTarget);
        }}
        className={`block w-full h-auto bg-transparent border border-transparent hover:border-dashed hover:border-gray-300 focus:border-violet-400 focus:bg-white/10 focus:outline-none resize-none overflow-hidden rounded px-1 py-0.5 transition whitespace-pre-wrap break-words ${className}`}
        style={{
          scrollbarWidth: 'none',
        }}
      />
    );
  }

  return (
    <input
      type="text"
      value={value || ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full min-w-0 bg-transparent border border-transparent hover:border-dashed hover:border-gray-300 focus:border-violet-400 focus:bg-white/10 focus:outline-none rounded px-1 py-0.5 transition ${className}`}
    />
  );
}