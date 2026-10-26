import { prisma } from '../../lib/prisma';

export class DeadlineWatcherService {
  private static timer: NodeJS.Timeout | null = null;

  static async checkDeadlinesAndReviewWindows(): Promise<number> {
    const now = new Date();
    let newAlertsCount = 0;

    try {
      const activeMilestones = await prisma.milestone.findMany({
        where: {
          status: { in: ['PENDING', 'SUBMITTED', 'IN_REVIEW'] },
        },
        include: {
          agreement: true,
        },
      });

      for (const m of activeMilestones) {
        // 1. Deadline Breached check
        if (m.status === 'PENDING' && m.deadline < now) {
          const existingAlert = await prisma.alert.findFirst({
            where: {
              milestoneId: m.id,
              type: 'DEADLINE_BREACHED',
              resolved: false,
            },
          });

          if (!existingAlert) {
            await prisma.alert.create({
              data: {
                agreementId: m.agreementId,
                milestoneId: m.id,
                type: 'DEADLINE_BREACHED',
                severity: 'CRITICAL',
                message: `Milestone '${m.title}' for agreement '${m.agreement.title}' has breached its deadline (${m.deadline.toISOString()}).`,
              },
            });
            newAlertsCount++;
          }
        }

        // 2. Deadline Approaching check (within 24 hours)
        const msUntilDeadline = m.deadline.getTime() - now.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (m.status === 'PENDING' && msUntilDeadline > 0 && msUntilDeadline <= oneDayMs) {
          const existingAlert = await prisma.alert.findFirst({
            where: {
              milestoneId: m.id,
              type: 'DEADLINE_APPROACHING',
              resolved: false,
            },
          });

          if (!existingAlert) {
            const hoursLeft = Math.round(msUntilDeadline / (60 * 60 * 1000));
            await prisma.alert.create({
              data: {
                agreementId: m.agreementId,
                milestoneId: m.id,
                type: 'DEADLINE_APPROACHING',
                severity: 'WARNING',
                message: `Milestone '${m.title}' deadline is approaching in ${hoursLeft} hour(s).`,
              },
            });
            newAlertsCount++;
          }
        }

        // 3. Review window expiring check (for SUBMITTED milestones)
        if (m.status === 'SUBMITTED' && m.submittedAt) {
          const reviewWindowMs = (m.reviewWindowSeconds || 259200) * 1000;
          const reviewDeadline = new Date(m.submittedAt.getTime() + reviewWindowMs);

          if (now > reviewDeadline) {
            const existingAlert = await prisma.alert.findFirst({
              where: {
                milestoneId: m.id,
                type: 'REVIEW_WINDOW_EXPIRING',
                resolved: false,
              },
            });

            if (!existingAlert) {
              await prisma.alert.create({
                data: {
                  agreementId: m.agreementId,
                  milestoneId: m.id,
                  type: 'REVIEW_WINDOW_EXPIRING',
                  severity: 'CRITICAL',
                  message: `Client review window for submitted milestone '${m.title}' has expired. Auto-approval eligible.`,
                },
              });
              newAlertsCount++;
            }
          }
        }

        // 4. In-flight milestone health & predictive delay risk check
        if (m.status === 'PENDING') {
          const health = await this.evaluateMilestoneHealth(m.id);
          if (health.healthStatus !== 'ON_TRACK') {
            newAlertsCount++;
          }
        }
      }
    } catch (err: any) {
      console.error('[DeadlineWatcher] Error during deadline scan:', err.message);
    }

    return newAlertsCount;
  }

  /**
   * Scans an active milestone to predict in-flight delay risk before deadlines breach.
   * Evaluates elapsed time ratio, commit delivery status, and thread communication silence.
   */
  static async evaluateMilestoneHealth(milestoneId: string): Promise<{
    milestoneId: string;
    healthStatus: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL_DELAY' | 'COMPLETED';
    timeProgressRatio: number;
    hoursSinceLastMessage: number;
    daysRemaining: number;
  }> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        agreement: {
          include: {
            thread: {
              include: {
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    if (milestone.status === 'APPROVED' || milestone.status === 'SUBMITTED') {
      return {
        milestoneId,
        healthStatus: 'COMPLETED',
        timeProgressRatio: 1.0,
        hoursSinceLastMessage: 0,
        daysRemaining: 0,
      };
    }

    const now = Date.now();
    const deadlineTime = new Date(milestone.deadline).getTime();
    const createdAtTime = new Date(milestone.createdAt).getTime();
    const totalDuration = Math.max(1000, deadlineTime - createdAtTime);
    const timeElapsed = Math.max(0, now - createdAtTime);
    const timeProgressRatio = Math.min(timeElapsed / totalDuration, 1.0);
    const daysRemaining = Math.max(0, Math.round((deadlineTime - now) / 86400000));

    const lastMsg = milestone.agreement.thread?.messages?.[0];
    const lastMsgTime = lastMsg ? new Date(lastMsg.createdAt).getTime() : createdAtTime;
    const hoursSinceLastMessage = Math.max(0, (now - lastMsgTime) / (1000 * 3600));

    let healthStatus: 'ON_TRACK' | 'AT_RISK' | 'CRITICAL_DELAY' = 'ON_TRACK';

    if (timeProgressRatio > 0.85 && !milestone.submissionCommitSha) {
      healthStatus = 'CRITICAL_DELAY';
    } else if (
      (timeProgressRatio > 0.5 && !milestone.submissionCommitSha && hoursSinceLastMessage > 48) ||
      (timeProgressRatio > 0.7 && !milestone.submissionCommitSha)
    ) {
      healthStatus = 'AT_RISK';
    }

    // Persist health status in milestone record
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { healthStatus },
    });

    // Create proactive alert if at risk or critical delay
    if (healthStatus !== 'ON_TRACK') {
      const existingAlert = await prisma.alert.findFirst({
        where: {
          milestoneId: milestone.id,
          type: `PREDICTED_${healthStatus}`,
          resolved: false,
        },
      });

      if (!existingAlert) {
        await prisma.alert.create({
          data: {
            agreementId: milestone.agreementId,
            milestoneId: milestone.id,
            type: `PREDICTED_${healthStatus}`,
            severity: healthStatus === 'CRITICAL_DELAY' ? 'CRITICAL' : 'WARNING',
            message: `Predictive Telemetry: Milestone #${milestone.milestoneIndex + 1} ('${milestone.title}') is ${healthStatus}. Velocity is low with ${daysRemaining} day(s) remaining.`,
          },
        });
      }
    }

    return {
      milestoneId,
      healthStatus,
      timeProgressRatio,
      hoursSinceLastMessage,
      daysRemaining,
    };
  }

  static startWatcher(intervalMs = 60000) {
    if (this.timer) {
      return;
    }

    // Run once immediately on server boot
    this.checkDeadlinesAndReviewWindows().catch((err) =>
      console.error('[DeadlineWatcher] Boot check error:', err)
    );

    // Schedule every minute
    this.timer = setInterval(() => {
      this.checkDeadlinesAndReviewWindows();
    }, intervalMs);

    console.log(`[DeadlineWatcher] Service running every ${intervalMs / 1000}s`);
  }

  static stopWatcher() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
