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
      }
    } catch (err: any) {
      console.error('[DeadlineWatcher] Error during deadline scan:', err.message);
    }

    return newAlertsCount;
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
