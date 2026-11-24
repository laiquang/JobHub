export interface UserCV {
  id: number;
  userId: number;
  title: string;
  templateKey: string;
  cvData: CVData;
  settings: CVSettings | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CVSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  themeColor: string;
  customColor: string;
}

export interface CVData {
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    address: string;
    summary: string;
    avatar?: string;
    dateOfBirth?: string;
    gender?: string;
    website?: string;
  };

  education: EducationItem[];
  experience: ExperienceItem[];
  skills: string[];
  projects: ProjectItem[];
  certificates: CertificateItem[];
}

export interface EducationItem {
  school: string;
  major: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface ExperienceItem {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface ProjectItem {
  name: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  technologies?: string[];
  link?: string;
}

export interface CertificateItem {
  name: string;
  organization?: string;
  date?: string;
  description?: string;
}

export interface CreateUserCVDTO {
  userId: number;
  title: string;
  templateKey: string;
  cvData: CVData;
  settings?: CVSettings;
}

export interface UpdateUserCVDTO {
  title?: string;
  templateKey?: string;
  cvData?: CVData;
  settings?: CVSettings;
}