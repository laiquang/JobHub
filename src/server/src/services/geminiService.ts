import { GoogleGenerativeAI } from '@google/generative-ai';
import { JobWithDetails, CVAnalysis, CVScoringResult } from '@/types';
import {
  GeminiConfig,
  CVScoringPromptData,
  GeminiCVScoringResponse,
  AIResult
} from "@/types";
import { AppError } from '@/middlewares/errorHandler';
import { RecommendedJob } from "@/types";

/**
 * Gemini Service - Tích hợp Google Gemini AI cho việc chấm điểm CV
 */
export class GeminiService {
  private genAI!: GoogleGenerativeAI;
  private config!: GeminiConfig;

  constructor() {
    this.init();
  }

  private init() {
    // Ưu tiên GEMINI_TOKEN theo CodeFlow pattern
    const apiKey = process.env.GEMINI_TOKEN || process.env.GEMINI_API_KEY;
    
    // Fallback models theo order priority
    const availableModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-pro',
      'gemini-1.0-pro',
      'gemini-pro-vision'
    ];
    
    this.config = {
      apiKey: apiKey!,
      model: process.env.GEMINI_MODEL || availableModels[0],
      maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192'),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
    };

    if (!this.config.apiKey) {
      throw new AppError('GEMINI_TOKEN or GEMINI_API_KEY is not configured', 500);
    }

    console.log('🤖 Initializing Gemini AI with model:', this.config.model);

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
  }

  /**
   * Chấm điểm CV sử dụng Gemini AI với cấu hình hiện đại và fallback models
   */
  async scoreCVWithAI(cvAnalysis: CVAnalysis, job: JobWithDetails, aiResult: AIResult): Promise<CVScoringResult> {
    const fallbackModels = [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      'gemini-1.0-pro'
    ];

    // Try current model first
    for (const modelName of [this.config.model, ...fallbackModels]) {
      try {
        console.log(`🔄 Trying Gemini model: ${modelName}`);
        
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: this.config.maxTokens,
            temperature: this.config.temperature,
          },
        });

        const prompt = this.buildCVScoringPrompt({ cvAnalysis, job, aiResult });
        
        console.log(`🤖 Calling Gemini AI (${modelName}) for CV scoring...`);
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        console.log(`✅ Success with model: ${modelName}`);
        return this.parseAIResponse(response, job);
        
      } catch (error: any) {
        console.log(`❌ Failed with model ${modelName}:`, error.message?.substring(0, 100));
        
        // If this is the last model, handle the error
        if (modelName === fallbackModels[fallbackModels.length - 1]) {
          console.error('❌ All Gemini models failed, using fallback response');
          return this.handleGeminiError(error, job);
        }
        // Otherwise, continue to next model
        continue;
      }
    }

    // Fallback if all models fail
    return this.handleGeminiError(new Error('All Gemini models unavailable'), job);
  }

  /**
   * Build prompt for CV scoring theo cấu trúc CodeFlow
   */
  private buildCVScoringPrompt(data: CVScoringPromptData): string {
    const { cvAnalysis, job , aiResult } = data;

    return `
Bạn là một chuyên gia HR và AI tuyển dụng.

========================
QUY TẮC BẮT BUỘC
========================

1. Chỉ đánh giá CV theo CÔNG VIỆC ở mục "THÔNG TIN CÔNG VIỆC".

2. Không được sử dụng bất kỳ công việc nào trong "KẾT QUẢ GỢI Ý TỪ FAISS" để phân tích CV.

3. Danh sách "Recommended Jobs" chỉ dùng để gợi ý nghề nghiệp khác phù hợp với CV.

4. Matching Skills phải là kỹ năng xuất hiện trong cả CV và Job được chọn.

5. Missing Skills phải là kỹ năng Job yêu cầu nhưng CV chưa có.

6. Strengths phải dựa trên các kỹ năng và kinh nghiệm phù hợp với Job được chọn.

7. Weaknesses và Suggestions chỉ được dựa trên Job được chọn.

Hệ thống AI BGE-M3 + FAISS đã phân tích CV và tính toán mức độ phù hợp với công việc.

ĐIỂM PHÙ HỢP đã được model AI tính toán.

Bạn KHÔNG được tự tính lại điểm.

Nhiệm vụ của bạn là:

- Giải thích vì sao CV phù hợp với công việc.
- Phân tích điểm mạnh.
- Phân tích điểm yếu.
- Xác định các kỹ năng còn thiếu.
- Đưa ra gợi ý cải thiện CV.
- Giữ nguyên điểm phù hợp do model AI cung cấp.
**THÔNG TIN CÔNG VIỆC:**
- Tên công việc: ${job.nameJob}
- Công ty: ${job.companyName || 'Không xác định'}
- Yêu cầu: ${job.request}
- Mô tả: ${job.desc}
- Kinh nghiệm yêu cầu: ${job.experience || 'Không xác định'}
- Trình độ học vấn: ${job.education || 'Không xác định'}
- Loại công việc: ${job.typeWork || 'Không xác định'}

**KẾT QUẢ TỪ MODEL AI (BGE-M3 + FAISS)**

========================
KẾT QUẢ TỪ MODEL AI
========================
========================
KẾT QUẢ GỢI Ý TỪ FAISS
========================

Danh sách dưới đây chỉ dùng để GỢI Ý nghề nghiệp phù hợp với CV.

TUYỆT ĐỐI KHÔNG sử dụng các công việc này để đánh giá CV.

Danh sách:
${aiResult.recommendedJobs
    .map(
        (x, index) => `
${index + 1}

Vị trí: ${x.title}

Công ty: ${x.company}

Độ phù hợp: ${x.score}%
`
    )
    .join("\n")}

====================================

Similarity

${aiResult.similarity}%

====================================

Matching Skills

${aiResult.matchingSkills.join(", ")}

====================================

Missing Skills

${aiResult.missingSkills.join(", ")}

====================================
**NỘI DUNG CV:**
${cvAnalysis.extractedText}

**KỸ NĂNG TỪ CV:**
${cvAnalysis.skills.join(', ')}

**KINH NGHIỆM TỪ CV:**
${cvAnalysis.experience}

**HỌC VẤN TỪ CV:**
${cvAnalysis.education}

**ĐIỂM CHÍNH:**
${cvAnalysis.keyPoints.join('\n- ')}

Hãy phân tích kỹ và trả về kết quả dưới dạng JSON với cấu trúc sau:

{
  "score": [số điểm từ 0-100],
  "summary": "[tóm tắt ngắn gọn về CV này - tối đa 255 ký tự]",
  "strengths": [
    "[điểm mạnh 1]",
    "[điểm mạnh 2]",
    "[điểm mạnh 3]"
  ],
  "weaknesses": [
    "[điểm yếu 1]", 
    "[điểm yếu 2]",
    "[điểm yếu 3]"
  ],
  "matchingSkills": [
    "[kỹ năng phù hợp 1]",
    "[kỹ năng phù hợp 2]"
  ],
  "missingSkills": [
    "[kỹ năng thiếu 1]",
    "[kỹ năng thiếu 2]",
    "[kỹ năng thiếu 3]"
  ],
  "suggestions": [
    "[gợi ý cải thiện 1]",
    "[gợi ý cải thiện 2]", 
    "[gợi ý cải thiện 3]",
    "[gợi ý cải thiện 4]",
    "[gợi ý cải thiện 5]"
  ],
  "experienceMatch": "[phân tích mức độ phù hợp kinh nghiệm - tối đa 200 ký tự]",
  "educationMatch": "[phân tích mức độ phù hợp học vấn - tối đa 200 ký tự]"
}

**LƯU Ý QUAN TRỌNG:**
- Chỉ trả về JSON hợp lệ, không có markdown hoặc text khác
- Điểm số phải phản ánh chính xác mức độ phù hợp
- Gợi ý phải cụ thể và có thể thực hiện được
- Phân tích phải khách quan và công bằng
- Nội dung phải bằng tiếng Việt
- Escape tất cả quotes trong strings: sử dụng \\" thay vì "
- Đảm bảo JSON hoàn toàn hợp lệ
    `.trim();
  }

  /**
   * Parse AI response với error handling theo CodeFlow pattern
   */
  private parseAIResponse(text: string, job: JobWithDetails): CVScoringResult {
    try {
      console.log('Raw Gemini response:', text.substring(0, 500) + '...');

      // Clean text từ markdown như CodeFlow
      let cleanText = text.trim();
      
      // Loại bỏ các markdown code blocks
      cleanText = cleanText.replace(/^```(?:json)?\s*\n?/gm, '');
      cleanText = cleanText.replace(/\n?```\s*$/gm, '');
      cleanText = cleanText.trim();

      // Fix JSON escape issues (pattern từ CodeFlow)
      cleanText = this.fixJsonEscapeIssues(cleanText);

      console.log('Cleaned text for parsing:', cleanText.substring(0, 300) + '...');

      const aiResult: GeminiCVScoringResponse = JSON.parse(cleanText);

      // Validation theo CodeFlow pattern
      this.validateAIResponse(aiResult);

      // Convert sang CVScoringResult format
      return {
        score: Math.min(Math.max(aiResult.score !== undefined ? aiResult.score : 60, 0), 100),
        summary: aiResult.summary || (aiResult.score === 0 ? 'CV này không phù hợp với vị trí ứng tuyển do thiếu nhiều thông tin quan trọng.' : 'CV này được đánh giá dựa trên mức độ phù hợp với vị trí ứng tuyển.'),
        suggestions: Array.isArray(aiResult.suggestions) ? aiResult.suggestions : [
          'Cải thiện mô tả kinh nghiệm với số liệu cụ thể',
          'Thêm kỹ năng chuyên môn phù hợp với vị trí',
          'Tối ưu hóa format CV để dễ đọc hơn'
        ],
        analysis: {
          strengths: Array.isArray(aiResult.strengths) ? aiResult.strengths : ['CV có cấu trúc tốt'],
          weaknesses: Array.isArray(aiResult.weaknesses) ? aiResult.weaknesses : ['Cần cải thiện một số điểm'],
          matchingSkills: Array.isArray(aiResult.matchingSkills) ? aiResult.matchingSkills : [],
          missingSkills: Array.isArray(aiResult.missingSkills) ? aiResult.missingSkills : []
        },
        jobMatch: {
          jobTitle: job.nameJob,
          companyName: job.company?.nameCompany || 'Công ty không xác định',
          requirements: [
            aiResult.experienceMatch || 'Kinh nghiệm phù hợp',
            aiResult.educationMatch || 'Trình độ phù hợp'
          ]
        }
      };

    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.log('Raw AI response for debug:', text);
      
      // Fallback response
      return this.getFallbackResponse(job);
    }
  }

  /**
   * Fix JSON escape issues - pattern từ CodeFlow
   */
  private fixJsonEscapeIssues(jsonText: string): string {
    try {
      JSON.parse(jsonText);
      return jsonText;
    } catch (error) {
      console.log('JSON parsing failed, attempting to fix escape issues...');

      let fixedText = jsonText;

      // Fix quotes trong string values
      fixedText = fixedText.replace(/"(summary|experienceMatch|educationMatch)":\s*"((?:[^"\\]|\\.)*)"/g, 
        (match, field, content) => {
          let tempContent = content.replace(/\\"/g, '__ESCAPED_QUOTE__');
          tempContent = tempContent.replace(/"/g, '\\"');
          tempContent = tempContent.replace(/__ESCAPED_QUOTE__/g, '\\"');
          return `"${field}": "${tempContent}"`;
        });

      // Fix quotes trong arrays
      fixedText = fixedText.replace(/"(strengths|weaknesses|matchingSkills|missingSkills|suggestions)":\s*\[(.*?)\]/gs,
        (match: string, field: string, arrayContent: string) => {
          let fixedArray = arrayContent.replace(/"((?:[^"\\]|\\.)*)"/g, (itemMatch: string, itemContent: string) => {
            let tempContent = itemContent.replace(/\\"/g, '__ESCAPED_QUOTE__');
            tempContent = tempContent.replace(/"/g, '\\"');
            tempContent = tempContent.replace(/__ESCAPED_QUOTE__/g, '\\"');
            return `"${tempContent}"`;
          });
          return `"${field}": [${fixedArray}]`;
        });

      try {
        JSON.parse(fixedText);
        console.log('Successfully fixed JSON escape issues');
        return fixedText;
      } catch (secondError) {
        console.warn('Could not fix JSON escape issues:', secondError);
        return jsonText;
      }
    }
  }

  /**
   * Validate AI response theo CodeFlow pattern
   */
  private validateAIResponse(response: GeminiCVScoringResponse): void {
    if (!response.summary || typeof response.summary !== 'string') {
      throw new Error('Invalid summary field');
    }

    if (response.summary.length > 255) {
      console.log('⚠️ Summary too long, truncating...');
      response.summary = response.summary.substring(0, 252) + '...';
    }

    if (typeof response.score !== 'number' || response.score < 0 || response.score > 100) {
      throw new Error('Score must be a number between 0 and 100');
    }

    // Validate arrays
    const arrayFields: (keyof GeminiCVScoringResponse)[] = ['strengths', 'weaknesses', 'matchingSkills', 'missingSkills', 'suggestions'];
    arrayFields.forEach(field => {
      if (response[field] && !Array.isArray(response[field])) {
        throw new Error(`${field} must be an array`);
      }
    });
  }

  /**
   * Handle Gemini errors với specific error types
   */
  private handleGeminiError(error: any, job: JobWithDetails): CVScoringResult {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error('Gemini AI Error Details:', {
      message: errorMessage,
      type: error.constructor.name,
      stack: error.stack?.substring(0, 500)
    });

    if (errorMessage?.includes('not found') || errorMessage?.includes('404')) {
      console.error('🚫 Model not found. Current model:', this.config.model);
      console.error('💡 Try updating GEMINI_MODEL to: gemini-1.0-pro or gemini-pro');
    }
    
    if (errorMessage?.includes('quota') || errorMessage?.includes('limit')) {
      console.error('⚠️ API quota exceeded');
    }
    
    if (errorMessage?.includes('API key') || errorMessage?.includes('401')) {
      console.error('🔑 Invalid API key');
    }

    return this.getFallbackResponse(job);
  }

  /**
   * Get fallback response khi AI fail
   */
  private getFallbackResponse(job: JobWithDetails): CVScoringResult {
    return {
      score: 75,
      summary: '⚠️ AI đang bảo trì - Đây là phân tích tự động cơ bản dựa trên cấu trúc CV và mức độ phù hợp với vị trí ứng tuyển.',
      suggestions: [
        'AI đang xử lý phân tích chi tiết, vui lòng thử lại',
        'Cải thiện mô tả kinh nghiệm làm việc với số liệu cụ thể',
        'Thêm kỹ năng chuyên môn phù hợp với vị trí ứng tuyển',
        'Tối ưu hóa format CV để dễ đọc và chuyên nghiệp hơn',
        'Bổ sung thông tin về các dự án đã thực hiện'
      ],
      analysis: {
        strengths: [
          'CV có nội dung phù hợp với vị trí ứng tuyển',
          'Cấu trúc CV rõ ràng và dễ đọc',
          'Thông tin liên hệ đầy đủ'
        ],
        weaknesses: [
          'Cần phân tích chi tiết hơn từ AI',
          'Có thể cải thiện mô tả kinh nghiệm',
          'Cần bổ sung thêm kỹ năng chuyên môn'
        ],
        matchingSkills: ['Đang phân tích...'],
        missingSkills: ['Đang phân tích...']
      },
      jobMatch: {
        jobTitle: job.nameJob,
        companyName: job.company?.nameCompany || 'Công ty không xác định',
        requirements: ['Đang phân tích yêu cầu...']
      }
    };
  }

  /**
   * Test connection to Gemini AI
   */
  async testConnection(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.config.model,
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.1,
        }
      });
      
      const result = await model.generateContent('Test connection. Respond with: "Connection successful"');
      const response = result.response.text();
      
      console.log('✅ Gemini AI connection test successful:', response);
      return response.length > 0;
    } catch (error) {
      console.error('❌ Gemini AI connection test failed:', error);
      return false;
    }
  }
}