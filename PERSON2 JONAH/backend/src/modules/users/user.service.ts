import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import { updateProfileSchema } from './user.schema';

export class UserService {
  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        walletAddress: true,
        role: true,
        name: true,
        bio: true,
        skills: true,
        githubUsername: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  static async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.role ? { role: data.role } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.skills !== undefined ? { skills: data.skills } : {}),
        ...(data.githubUsername !== undefined ? { githubUsername: data.githubUsername } : {}),
      },
      select: {
        id: true,
        walletAddress: true,
        role: true,
        name: true,
        bio: true,
        skills: true,
        githubUsername: true,
        updatedAt: true,
      },
    });
  }

  static async listUsers(role?: string) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: {
        id: true,
        walletAddress: true,
        role: true,
        name: true,
        skills: true,
        githubUsername: true,
      },
    });
  }
}
