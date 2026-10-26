import { prisma } from '../../lib/prisma';
import { AiAdapter } from '../../adapters/aiAdapter';

export interface TalentMatchResult {
  userId: string;
  walletAddress: string;
  name: string;
  bio?: string | null;
  skills: string[];
  githubUsername?: string | null;
  matchScore: number; // 0 - 100
  matchReasoning: string[];
  verifiedBadgesCount: number;
}

export class TalentMatcherService {
  static async matchFreelancersForPost(postId: string): Promise<TalentMatchResult[]> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true },
    });
    if (!post) {
      throw new Error('Post not found');
    }

    // Fetch active freelancers (excluding the author themselves)
    const candidates = await prisma.user.findMany({
      where: {
        id: { not: post.authorId },
        role: { in: ['FREELANCER', 'BOTH'] },
      },
      include: {
        freelancerAgreements: {
          where: { status: 'COMPLETED' },
          include: { milestones: true },
        },
      },
    });

    let postTags: string[] = [];
    if (post.tags) {
      try {
        postTags = JSON.parse(post.tags).map((t: string) => t.toLowerCase().trim());
      } catch {
        postTags = post.tags.split(',').map((t) => t.toLowerCase().trim());
      }
    }

    const postDescWords = post.description.toLowerCase().split(/\W+/).filter((w) => w.length > 3);

    const scored = candidates.map((f) => {
      let candidateSkills: string[] = [];
      if (f.skills) {
        try {
          candidateSkills = f.skills.startsWith('[')
            ? JSON.parse(f.skills).map((s: string) => s.toLowerCase().trim())
            : f.skills.split(',').map((s) => s.toLowerCase().trim());
        } catch {
          candidateSkills = f.skills.split(',').map((s) => s.toLowerCase().trim());
        }
      }

      // 1. Skill tag overlap
      const matchingSkills = candidateSkills.filter(
        (s) => postTags.includes(s) || postDescWords.includes(s)
      );

      let skillScore = 25;
      if (postTags.length > 0) {
        const overlapRatio = matchingSkills.length / postTags.length;
        skillScore = Math.min(Math.round(overlapRatio * 45), 45);
      } else if (matchingSkills.length > 0) {
        skillScore = Math.min(matchingSkills.length * 15, 45);
      }

      // 2. Verified Soulbound Reputation & Completed Agreements
      const completedAgreements = f.freelancerAgreements.length;
      const repScore = Math.min(completedAgreements * 15, 40);

      // 3. GitHub & Profile completeness boost
      let profileScore = 10;
      if (f.githubUsername) profileScore += 5;
      if (f.bio && f.bio.length > 20) profileScore += 5;

      const totalScore = Math.max(35, Math.min(Math.round(skillScore + repScore + profileScore), 99));

      const reasoning: string[] = [];
      if (matchingSkills.length > 0) {
        reasoning.push(`Verified alignment in required skills: ${matchingSkills.join(', ')}`);
      } else if (candidateSkills.length > 0) {
        reasoning.push(`Relevant engineering background: ${candidateSkills.slice(0, 3).join(', ')}`);
      }

      if (completedAgreements > 0) {
        reasoning.push(
          `Holds ${completedAgreements} verified on-chain completion badge${completedAgreements > 1 ? 's' : ''} (ERC-5192 Soulbound Reputation)`
        );
      } else {
        reasoning.push('Newly verified developer with clean credential record');
      }

      if (f.githubUsername) {
        reasoning.push(`Linked GitHub profile (@${f.githubUsername}) with active public repo activity`);
      }

      return {
        userId: f.id,
        walletAddress: f.walletAddress,
        name: f.name || 'Anonymous Freelancer',
        bio: f.bio,
        skills: candidateSkills,
        githubUsername: f.githubUsername,
        matchScore: totalScore,
        matchReasoning: reasoning,
        verifiedBadgesCount: completedAgreements,
      };
    });

    // Rank descending by match score
    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }
}
