import { apiClient } from './api';

export interface RecommendedJob {
  title: string;
  company: string;
  score: number;
  matchingSkills: string[];
  missingSkills: string[];
}

export interface CVScoringResult {
  score: number;
  summary: string;
  suggestions: string[];

  analysis: {
    strengths: string[];
    weaknesses: string[];
    matchingSkills: string[];
    missingSkills: string[];
  };

  jobMatch: {
    jobTitle: string;
    companyName: string;
    requirements: string[];
  };

  // ===== AI =====
  similarity: number;

  recommendedJobs: RecommendedJob[];

  bestJob: RecommendedJob;

  cvSkills: string[];
}

export interface CVScoringRequest {
  cvFile: File;

  jobId?: number;

  customJobDescription?: string;
}

export interface Company {
  id: number;
  nameCompany: string;
}

export interface Job {
  id: number;
  nameJob: string;
  company: Company;
}

export const cvScoringService = {

  /**
   * Chấm điểm CV với AI
   */
  async scoreCV(
    request: CVScoringRequest
  ): Promise<CVScoringResult> {

    const formData = new FormData();

    formData.append("cvFile", request.cvFile);

    if (request.jobId !== undefined) {
      formData.append(
        "jobId",
        request.jobId.toString()
      );
    }

    if (
      request.customJobDescription &&
      request.customJobDescription.trim() !== ""
    ) {
      formData.append(
        "customJobDescription",
        request.customJobDescription
      );
    }

    const response = await apiClient.post(
      "/cv-score",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data.data;
  },

  /**
   * Demo chấm điểm CV
   */
  async demoScoreCV(
    jobId: number
  ): Promise<CVScoringResult> {

    const response = await apiClient.post(
      "/cv-score/demo",
      {
        jobId,
      }
    );

    return response.data.data;
  },

  /**
   * Tìm kiếm công việc
   */
  async searchJobs(
    search: string
  ): Promise<Job[]> {

    const response = await apiClient.get(
      "/jobs",
      {
        params: {
          search,
          limit: 10,
        },
      }
    );

    return response.data.data.data || [];
  },

};