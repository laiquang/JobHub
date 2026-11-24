import {
  userCVRepository
} from '@/repositories/userCVRepository';

import {
  CreateUserCVDTO,
  UpdateUserCVDTO
} from '@/models/UserCV';

export class UserCVService {

  // =====================================================
  // CREATE CV
  // =====================================================

  async createCV(
    data: CreateUserCVDTO
  ) {

    if (!data.title?.trim()) {
      throw new Error(
        'Tên CV không được để trống'
      );
    }

    if (!data.cvData) {
      throw new Error(
        'Nội dung CV không được để trống'
      );
    }

    return userCVRepository.create({
      ...data,

      title:
        data.title.trim(),

      templateKey:
        data.templateKey || 'modern'
    });
  }

  // =====================================================
  // GET MY CVS
  // =====================================================

  async getMyCVs(
    userId: number
  ) {

    return userCVRepository.findByUserId(
      userId
    );
  }

  // =====================================================
  // GET CV
  // =====================================================

  async getCV(
    id: number,
    userId: number
  ) {

    return userCVRepository.findById(
      id,
      userId
    );
  }

  // =====================================================
  // UPDATE CV
  // =====================================================

  async updateCV(
    id: number,
    userId: number,
    data: UpdateUserCVDTO
  ) {

    if (
      data.title !== undefined &&
      !data.title.trim()
    ) {
      throw new Error(
        'Tên CV không được để trống'
      );
    }

    return userCVRepository.update(
      id,
      userId,
      data
    );
  }

  // =====================================================
  // DELETE CV
  // =====================================================

  async deleteCV(
    id: number,
    userId: number
  ) {

    return userCVRepository.delete(
      id,
      userId
    );
  }
}

export const userCVService =
  new UserCVService();