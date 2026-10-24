# SANKALP — AI Engineering Roadmap (Person 2: Jonah)
**Role: AI Person 2 (Backend & AI Intelligence Integration Lead)**  
**Workspace Directory:** `PERSON2 JONAH/backend/`  
**Service:** Node.js + Express + Prisma API (Port: `4000`)

---

## 📋 Overview of Assigned Features

Jonah is responsible for building **4 end-to-end features** centered around **Talent Discovery, In-Flight Telemetry, Scope Creep Detection, and Multilingual Contract Synthesis**:

1. **Feature 5: AI Talent Matcher with Explainable Ranking & Soulbound (SBT) Badges**
2. **Feature 6: In-Flight Milestone Health & Delay Risk Predictor** (Telemetry & Early Warning)
3. **Feature 7: Scope Creep & Change Request Detector** (Bridge to On-Chain Amendments)
4. **Feature 8: Multilingual Negotiation Assistant** (Hinglish / Hindi / English to Smart Agreement)

---

## 🎯 Feature 5: AI Talent Matcher with Explainable Ranking & Soulbound Reputation

### 5.1 The Feature
Clients posting jobs on [CommunityPage.jsx](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON4%20SUZAN/src/pages/CommunityPage.jsx) currently see a raw, unranked list of freelancers or proposals. 
The **AI Talent Matcher**:
- Evaluates the job description, required skills, and budget against registered freelancer profiles in Prisma (`User` table).
- Combines hard filters (skill tags, rate compatibility) with semantic profile embedding similarity.
- Integrates verified on-chain **Soulbound Reputation Tokens (ERC-5192)** earned from completed contracts.
- Returns an **Explainable Match Score (0–100%)** with bulleted reasons (*"94% Match: 4 completed Solidity agreements, 100% on-time milestone badge, matching budget range"*).

### 5.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **CREATE** | `PERSON2 JONAH/backend/src/modules/community/talentMatcher.service.ts` | Talent ranking & scoring logic |
| **MODIFY** | `PERSON2 JONAH/backend/src/adapters/aiAdapter.ts` | Add `rankTalentForPost()` method |
| **MODIFY** | `PERSON2 JONAH/backend/src/modules/community/community.routes.ts` | Endpoint `GET /api/community/posts/:id/recommended-talent` |
| **MODIFY** | `PERSON4 SUZAN/src/pages/CommunityPage.jsx` | Add "Recommended Freelancers" card with match explanation |

### 5.3 Step-by-Step Implementation

#### Step 1: Create `talentMatcher.service.ts`
```typescript
import { prisma } from '../../lib/prisma';
import { AiAdapter } from '../../adapters/aiAdapter';

export interface TalentMatchResult {
  userId: string;
  walletAddress: string;
  name: string;
  skills: string[];
  matchScore: number; // 0 - 100
  matchReasoning: string[];
  verifiedBadgesCount: number;
}

export class TalentMatcherService {
  static async matchFreelancersForPost(postId: string): Promise<TalentMatchResult[]> {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    // Fetch all active freelancers
    const freelancers = await prisma.user.findMany({
      where: {
        role: { in: ['FREELANCER', 'BOTH'] },
      },
      include: {
        freelancerAgreements: {
          where: { status: 'COMPLETED' },
          include: { milestones: true },
        },
      },
    });

    // Score each candidate
    const postTags = (post.tags ? JSON.parse(post.tags) : []).map((t: string) => t.toLowerCase());

    const results: TalentMatchResult[] = freelancers.map((f) => {
      const userSkills = (f.skills ? f.skills.split(',') : []).map((s) => s.trim().toLowerCase());
      
      // Calculate tag overlap
      const matchingSkills = userSkills.filter((s) => postTags.includes(s));
      const skillScore = postTags.length > 0 ? (matchingSkills.length / postTags.length) * 50 : 30;

      // Completed milestones & reputation boost
      const completedAgreements = f.freelancerAgreements.length;
      const repScore = Math.min(completedAgreements * 15, 40);

      const finalScore = Math.min(Math.round(skillScore + repScore + 10), 99);

      const reasoning: string[] = [];
      if (matchingSkills.length > 0) {
        reasoning.push(`Matches required skills: ${matchingSkills.join(', ')}`);
      }
      if (completedAgreements > 0) {
        reasoning.push(`Earned ${completedAgreements} verified on-chain completion badges`);
      } else {
        reasoning.push('New verified talent with matching portfolio profile');
      }

      return {
        userId: f.id,
        walletAddress: f.walletAddress,
        name: f.name || 'Anonymous Freelancer',
        skills: userSkills,
        matchScore: finalScore,
        matchReasoning: reasoning,
        verifiedBadgesCount: completedAgreements,
      };
    });

    // Sort descending by match score
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}
```

#### Step 2: Add Route in `community.routes.ts`
```typescript
router.get('/posts/:id/recommended-talent', authGuard, async (req, res, next) => {
  try {
    const recommendations = await TalentMatcherService.matchFreelancersForPost(req.params.id);
    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});
```

### 5.4 How to Test Feature 5
```bash
# 1. Login and get JWT
# 2. Call recommended-talent endpoint
curl -X GET http://localhost:4000/api/community/posts/<POST_ID>/recommended-talent \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
**Expected Output:** Array of freelancers ordered by `matchScore` with explainable bullet points (`matchReasoning`).

---

## ⏱️ Feature 6: In-Flight Milestone Health & Delay Risk Predictor

### 6.1 The Feature
Currently, SANKALP’s [deadlineWatcher.service.ts](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON2%20JONAH/backend/src/modules/deadlines/deadlineWatcher.service.ts) only emits alerts *after* deadlines are breached or within 24 hours of expiry.
The **In-Flight Health & Delay Predictor**:
- Monitors active milestones throughout their duration (not just at the deadline).
- Tracks commit frequency and velocity on the linked GitHub repository.
- Detects communication silence (zero messages in thread for >48 hours).
- Computes an in-flight status:
  - `ON_TRACK`: Steady commit activity, active thread discussion.
  - `AT_RISK`: <40% elapsed work with >60% elapsed time; silence detected.
  - `CRITICAL_DELAY`: Zero commits with <48 hours remaining.
- Generates early warning alerts in the `Alert` database table so the client and freelancer can resolve issues before late penalties trigger.

### 6.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **MODIFY** | `PERSON2 JONAH/backend/src/modules/deadlines/deadlineWatcher.service.ts` | Add predictive velocity & silence checks |
| **MODIFY** | `PERSON2 JONAH/backend/prisma/schema.prisma` | Add `healthStatus` field to `Milestone` model |
| **MODIFY** | `PERSON4 SUZAN/src/components/dashboard/MilestoneCard.jsx` | Display live Health Badge & Velocity Bar |

### 6.3 Step-by-Step Implementation

#### Step 1: Enhance `deadlineWatcher.service.ts`
```typescript
/**
 * Scans active milestones to predict delays before deadlines breach.
 */
static async evaluateMilestoneHealth(milestoneId: string): Promise<string> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { agreement: { include: { thread: { include: { messages: true } } } } },
  });

  if (!milestone || milestone.status !== 'PENDING') return 'COMPLETED';

  const now = Date.now();
  const deadlineTime = new Date(milestone.deadline).getTime();
  const createdAtTime = new Date(milestone.createdAt).getTime();
  const totalDuration = deadlineTime - createdAtTime;
  const timeElapsed = now - createdAtTime;
  const timeProgressRatio = Math.min(timeElapsed / totalDuration, 1.0);

  // Check last message timestamp
  const messages = milestone.agreement.thread?.messages || [];
  const lastMessageTime = messages.length > 0 
    ? new Date(messages[messages.length - 1].createdAt).getTime() 
    : createdAtTime;
  const hoursSinceLastMessage = (now - lastMessageTime) / (1000 * 3600);

  let healthStatus = 'ON_TRACK';

  if (timeProgressRatio > 0.6 && !milestone.submissionCommitSha && hoursSinceLastMessage > 48) {
    healthStatus = 'AT_RISK';
  }

  if (timeProgressRatio > 0.85 && !milestone.submissionCommitSha) {
    healthStatus = 'CRITICAL_DELAY';
  }

  // Create an alert if AT_RISK or CRITICAL_DELAY
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
          message: `Predictive Telemetry: Milestone #${milestone.milestoneIndex + 1} ('${milestone.title}') is ${healthStatus}. Velocity is low with ${Math.round((deadlineTime - now) / 86400000)} days remaining.`,
        },
      });
    }
  }

  return healthStatus;
}
```

### 6.4 How to Test Feature 6
1. Run backend deadline check manually via the alerts endpoint:
```bash
curl -X GET http://localhost:4000/api/alerts \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
2. Verify that alerts contain `type: "PREDICTED_AT_RISK"` with recommended next actions.

---

## 🔍 Feature 7: Scope Creep & Change Request Detector

### 7.1 The Feature
When a client rejects a deliverable or sends revision requests in [RejectMilestoneModal.jsx](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON4%20SUZAN/src/components/dashboard/RejectMilestoneModal.jsx), arguments often erupt over whether the request is a **bug fix** or **new out-of-scope work**.
The **Scope Creep Detector**:
- Takes the client's rejection feedback text and compares it with the milestone's signed `acceptanceCriteria` stored in `termsJson`.
- Uses semantic classification to determine:
  - `DEFECT_FIX`: Request directly corresponds to a failed criterion (e.g. *"Button does not click"*).
  - `SCOPE_CREEP`: Request introduces new features not in the contract (e.g. *"Also integrate Google Pay and Dark Mode"*).
- If `SCOPE_CREEP` is detected, it offers a 1-click shortcut to pre-fill an **On-Chain Amendment Proposal** (`proposeAmendment()` in [FairWork.sol](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON1%20YASH%20NAIK/contracts/contracts/FairWork.sol#L608)) requesting reasonable additional funds and deadline extension.

### 7.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **CREATE** | `PERSON2 JONAH/backend/src/modules/milestones/scopeDetector.service.ts` | Scope comparison logic |
| **MODIFY** | `PERSON2 JONAH/backend/src/adapters/aiAdapter.ts` | Add `detectScopeCreep()` |
| **MODIFY** | `PERSON2 JONAH/backend/src/modules/milestones/milestone.routes.ts` | Endpoint `POST /api/milestones/:id/check-scope` |
| **MODIFY** | `PERSON4 SUZAN/src/components/dashboard/RejectMilestoneModal.jsx` | Display scope classification banner |

### 7.3 Step-by-Step Implementation

#### Step 1: Create `scopeDetector.service.ts`
```typescript
import { prisma } from '../../lib/prisma';
import { AiAdapter } from '../../adapters/aiAdapter';

export class ScopeDetectorService {
  static async analyzeRevisionScope(milestoneId: string, rejectionReason: string) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { agreement: true },
    });
    if (!milestone) throw new Error('Milestone not found');

    const terms = JSON.parse(milestone.agreement.termsJson);
    const mTerms = terms.milestones.find((m: any) => m.index === milestone.milestoneIndex) || {};
    const criteria = mTerms.acceptanceCriteria || [];

    // Call AI Engine to classify scope
    const analysis = await AiAdapter.checkScopeCreep({
      milestoneTitle: milestone.title,
      acceptanceCriteria: criteria,
      rejectionReason,
    });

    return {
      milestoneId,
      classification: analysis.isScopeCreep ? 'SCOPE_CREEP' : 'DEFECT_FIX',
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      suggestedAmendment: analysis.isScopeCreep ? {
        suggestedAdditionalBudget: analysis.suggestedBudget || 0.2,
        suggestedAdditionalDays: analysis.suggestedDays || 3,
      } : null,
    };
  }
}
```

#### Step 2: Add Adapter Call in `aiAdapter.ts`
```typescript
static async checkScopeCreep(params: {
  milestoneTitle: string;
  acceptanceCriteria: string[];
  rejectionReason: string;
}): Promise<{ isScopeCreep: boolean; confidence: number; reasoning: string; suggestedBudget?: number; suggestedDays?: number }> {
  if (env.AI_MOCK) {
    const isCreep = params.rejectionReason.toLowerCase().includes('also') || params.rejectionReason.toLowerCase().includes('add');
    return {
      isScopeCreep: isCreep,
      confidence: 88,
      reasoning: isCreep 
        ? "Client's feedback introduces features outside original signed acceptance criteria."
        : "Client's feedback reports defects on stated criteria.",
      suggestedBudget: isCreep ? 0.25 : 0,
      suggestedDays: isCreep ? 4 : 0,
    };
  }
  // REST call to AI Engine /ai/contract/check-scope
}
```

### 7.4 How to Test Feature 7
```bash
curl -X POST http://localhost:4000/api/milestones/<MILESTONE_ID>/check-scope \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "rejectionReason": "The auth works, but please also add Apple Pay integration and an admin analytics dashboard."
  }'
```
**Expected Output:** JSON with `classification: "SCOPE_CREEP"`, explaining that Apple Pay was not in the original milestone, suggesting `suggestedAdditionalDays: 4`.

---

## 🌐 Feature 8: Multilingual Negotiation Assistant

### 8.1 The Feature
In regional and global settings (especially in India), developers and clients often negotiate in informal mixes of Hindi, Marathi, Hinglish, and English in [ChatPage.jsx](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON4%20SUZAN/src/pages/ChatPage.jsx).
The **Multilingual Negotiation Assistant**:
- Parses thread conversations conducted in Hinglish/Hindi (e.g., *"Bhai total budget 2 ETH hai, pehle milestone mein auth aur DB chahiye 7 din mein, baaki UI baadme"*).
- Understands intent, deadlines, milestones, and amounts.
- Normalizes and translates the negotiation into the platform's **canonical, deterministic English `AgreementTerms` JSON**.
- Generates the exact Keccak-256 hash required for on-chain deployment in [FairWork.sol](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON1%20YASH%20NAIK/contracts/contracts/FairWork.sol#L101).

### 8.2 Files to Create / Modify
| Action | File Path | Description |
|:---|:---|:---|
| **MODIFY** | `PERSON3 PERCY/prompts/contract_draft.md` | Add multilingual / Hinglish comprehension instructions |
| **MODIFY** | `PERSON2 JONAH/backend/src/adapters/aiAdapter.ts` | Pass language metadata to AI engine |
| **MODIFY** | `PERSON2 JONAH/backend/src/modules/agreements/agreement.service.ts` | Add language detection log |
| **MODIFY** | `PERSON4 SUZAN/src/pages/ChatPage.jsx` | Add "Hinglish / Multilingual Demo" quick-load button |

### 8.3 Step-by-Step Implementation

#### Step 1: Update Prompt Directives in `contract_draft.md`
```markdown
## MULTILINGUAL & HINGLISH COMPREHENSION DIRECTIVE:
1. Messages may be written in English, Hindi (Devanagari or Romanized Hinglish), or mixed dialects (e.g. "2 din mein delivery", "paisa escrow mein lock karo", "budget 1.5 ether fix hai").
2. Accurately translate and normalize all terms into clear, professional ENGLISH AgreementTerms.
3. Keep all on-chain field keys and status enums strictly canonical.
```

#### Step 2: Add Preset Demo Snippet in `ChatPage.jsx`
Add a 1-click button on `ChatPage.jsx`:
```jsx
<button
  onClick={() => {
    sendMessage(selectedThreadId, "Bhai requirement sun: Pehle phase mein smart contract deploy karna hai Polygon Amoy pe. Budget 1.2 ETH. Deadline 5 din mein.");
  }}
  className="text-xs text-forest underline"
>
  Load Hinglish Negotiation Demo
</button>
```

### 8.4 How to Test Feature 8
1. In the chat window, send messages in Hinglish:
   - *"Bhai budget 1.5 ETH hai. First milestone 0.8 ETH mein authentication aur database ready chahiye 7 din mein."*
2. Click **Generate AI Draft**.
3. Inspect generated draft on [DraftPage.jsx](file:///c:/Users/perci/Desktop/college/AI/PJ-s/PERSON4%20SUZAN/src/pages/DraftPage.jsx).
4. Verify that the contract title, descriptions, and milestone criteria are rendered in clean, professional English with exact amounts (`0.8 ETH` and `0.7 ETH`) and a 7-day deadline.

---

## 🚀 Jonah's Verification Checklist
- [ ] Backend tests: `npm test` in `PERSON2 JONAH/backend` passes 100%
- [ ] Talent matcher ranks candidates with explainable points on `GET /api/community/posts/:id/recommended-talent`
- [ ] Predictive delay alerts appear in the alerts table when milestones stall
- [ ] Scope creep endpoint accurately distinguishes bug fixes from new feature additions
- [ ] Multilingual Hinglish chats synthesize into valid canonical English agreement JSON
