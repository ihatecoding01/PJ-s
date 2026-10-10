import crypto from 'crypto';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';

export class AuthService {
  static async getOrCreateNonce(rawWalletAddress: string): Promise<string> {
    const walletAddress = ethers.getAddress(rawWalletAddress.toLowerCase());
    const nonce = crypto.randomBytes(16).toString('hex');

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { nonce },
      create: {
        walletAddress,
        nonce,
        role: 'BOTH',
      },
    });

    return user.nonce;
  }

  static async verifySignature(rawWalletAddress: string, signature: string) {
    const walletAddress = ethers.getAddress(rawWalletAddress.toLowerCase());

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      throw new Error('User not found. Please request a nonce first.');
    }

    const expectedMessages = [
      `FairWork login: ${user.nonce}`,
      `Sign in to FairWork: ${user.nonce}`,
    ];
    let recoveredAddress: string | null = null;

    for (const msg of expectedMessages) {
      try {
        const recovered = ethers.verifyMessage(msg, signature);
        if (recovered.toLowerCase() === walletAddress.toLowerCase()) {
          recoveredAddress = recovered;
          break;
        }
      } catch {}
    }

    if (!recoveredAddress) {
      throw new Error('Cryptographic signature does not match wallet address.');
    }

    // Rotate nonce after successful verification to prevent replay attacks
    const newNonce = crypto.randomBytes(16).toString('hex');
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { nonce: newNonce },
    });

    const token = jwt.sign(
      {
        userId: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        role: updatedUser.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    return {
      token,
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        role: updatedUser.role,
        name: updatedUser.name,
        bio: updatedUser.bio,
        skills: updatedUser.skills,
        githubUsername: updatedUser.githubUsername,
      },
    };
  }
}
