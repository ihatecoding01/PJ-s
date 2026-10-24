import { ethers } from 'ethers';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import {
  createPostSchema,
  searchPostQuerySchema,
  submitProposalSchema,
  createThreadSchema,
  sendMessageSchema,
} from './community.schema';

export class CommunityService {
  // --- Posts ---
  static async createPost(authorId: string, data: z.infer<typeof createPostSchema>) {
    return prisma.post.create({
      data: {
        authorId,
        type: data.type,
        title: data.title,
        description: data.description,
        budget: data.budget,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        status: 'OPEN',
      },
      include: {
        author: {
          select: { id: true, walletAddress: true, name: true, role: true },
        },
      },
    });
  }

  static async listPosts(query: z.infer<typeof searchPostQuerySchema>) {
    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.query) {
      where.OR = [
        { title: { contains: query.query } },
        { description: { contains: query.query } },
      ];
    }
    if (query.tag) {
      where.tags = { contains: query.tag };
    }

    return prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, walletAddress: true, name: true, role: true },
        },
        _count: {
          select: { proposals: true },
        },
      },
    });
  }

  static async getPostById(id: string) {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, walletAddress: true, name: true, role: true, skills: true },
        },
        proposals: {
          include: {
            freelancer: {
              select: { id: true, walletAddress: true, name: true, skills: true, githubUsername: true },
            },
          },
        },
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }
    return post;
  }

  // --- Proposals ---
  static async submitProposal(
    postId: string,
    freelancerId: string,
    data: z.infer<typeof submitProposalSchema>
  ) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new Error('Target post does not exist');
    }
    if (post.authorId === freelancerId) {
      throw new Error('Cannot submit proposal to your own post');
    }

    return prisma.proposal.create({
      data: {
        postId,
        freelancerId,
        coverLetter: data.coverLetter,
        proposedBudget: data.proposedBudget,
        proposedDuration: data.proposedDuration,
        status: 'PENDING',
      },
      include: {
        freelancer: {
          select: { id: true, walletAddress: true, name: true, skills: true },
        },
      },
    });
  }

  static async getProposalsForPost(postId: string) {
    return prisma.proposal.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' },
      include: {
        freelancer: {
          select: { id: true, walletAddress: true, name: true, skills: true, githubUsername: true },
        },
      },
    });
  }

  // --- Threads & Messages ---
  static async getOrCreateThread(
    currentUserId: string,
    data: z.infer<typeof createThreadSchema>
  ) {
    let clientId = currentUserId;
    let freelancerId = data.recipientId;

    if (freelancerId.startsWith('0x')) {
      let checksummed = freelancerId;
      try {
        checksummed = ethers.getAddress(freelancerId.toLowerCase());
      } catch {}
      const u = await prisma.user.findFirst({
        where: { walletAddress: checksummed },
      });
      if (u) {
        freelancerId = u.id;
      } else {
        const newUser = await prisma.user.create({
          data: {
            walletAddress: checksummed,
            nonce: Math.random().toString(36).substring(2),
            role: 'BOTH',
          },
        });
        freelancerId = newUser.id;
      }
    }

    // Check if a thread already exists between these two users (and optionally for this post)
    const existing = await prisma.thread.findFirst({
      where: {
        OR: [
          { clientId, freelancerId, postId: data.postId || undefined },
          { clientId: freelancerId, freelancerId: clientId, postId: data.postId || undefined },
        ],
      },
      include: {
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 20 },
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.thread.create({
      data: {
        postId: data.postId,
        clientId,
        freelancerId,
        subject: data.subject,
      },
      include: {
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
      },
    });
  }

  static async listUserThreads(userId: string) {
    return prisma.thread.findMany({
      where: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
        post: { select: { id: true, title: true, budget: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  static async getThreadById(threadId: string, userId: string) {
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        client: { select: { id: true, walletAddress: true, name: true } },
        freelancer: { select: { id: true, walletAddress: true, name: true } },
        post: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, walletAddress: true, name: true } },
          },
        },
      },
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    if (thread.clientId !== userId && thread.freelancerId !== userId) {
      throw new Error('Unauthorized to view this thread');
    }

    return thread;
  }

  static async sendMessage(
    threadId: string,
    senderId: string,
    data: z.infer<typeof sendMessageSchema>
  ) {
    const thread = await prisma.thread.findUnique({ where: { id: threadId } });
    if (!thread) {
      throw new Error('Thread not found');
    }

    if (thread.clientId !== senderId && thread.freelancerId !== senderId) {
      throw new Error('Unauthorized to post in this thread');
    }

    const message = await prisma.message.create({
      data: {
        threadId,
        senderId,
        content: data.content,
      },
      include: {
        sender: { select: { id: true, walletAddress: true, name: true } },
      },
    });

    // Touch thread updatedAt
    await prisma.thread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return message;
  }
}
