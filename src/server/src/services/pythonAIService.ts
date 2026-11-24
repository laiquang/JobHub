import axios from "axios";

export interface RecommendedJob {
    title: string;
    company: string;
    score: number;
    matchingSkills: string[];
    missingSkills: string[];
}
export interface SelectedJob {

    title: string;

    description: string;

    requirements: string;

}
export interface AIResult {
    recommendedJobs: RecommendedJob[];

    bestJob: RecommendedJob;

    similarity: number;

    matchingSkills: string[];

    missingSkills: string[];

    cvSkills: string[];
}
export class PythonAIService {

    async evaluateCV(
        cvText: string,
        selectedJob: SelectedJob
    ): Promise<AIResult> {

        const response = await axios.post<AIResult>(
            "http://127.0.0.1:8001/evaluate",
            {
                cv_text: cvText,
                selected_job: selectedJob
            }
        );

        return response.data;
    }

}