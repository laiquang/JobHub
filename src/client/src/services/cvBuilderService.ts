import { apiClient } from './api';

export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  summary: string;
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

export interface CVData {
  personalInfo: PersonalInfo;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: string[];
  projects: ProjectItem[];
  certificates: CertificateItem[];
}

export interface UserCV {
  id: number;
  userId: number;
  title: string;
  templateKey: string;
  cvData: CVData;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCVRequest {
  title: string;
  templateKey: string;
  cvData: CVData;
}

export interface UpdateCVRequest {
  title?: string;
  templateKey?: string;
  cvData?: CVData;
}

export const cvBuilderService = {
  async createCV(data: CreateCVRequest): Promise<UserCV> {
    const response = await apiClient.post('/cvs', data);
    return response.data.data;
  },

  async getMyCVs(): Promise<UserCV[]> {
    const response = await apiClient.get('/cvs');
    return response.data.data;
  },

  async getCV(id: number): Promise<UserCV> {
    const response = await apiClient.get(`/cvs/${id}`);
    return response.data.data;
  },

  async updateCV(
    id: number,
    data: UpdateCVRequest
  ): Promise<UserCV> {
    const response = await apiClient.put(`/cvs/${id}`, data);
    return response.data.data;
  },

  async deleteCV(id: number): Promise<void> {
    await apiClient.delete(`/cvs/${id}`);
  },
};