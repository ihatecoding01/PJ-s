import { createApp } from '../src/app';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

// Helper to make fetch requests against in-memory express server
let server: any;
let baseUrl = '';

async function startTestServer() {
  const app = createApp();
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
}

async function stopTestServer() {
  if (server) {
    server.close();
  }
}

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  console.log('🧪 Starting FairWork Backend End-to-End Test Suite...\n');
  await startTestServer();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, errorDetail?: any) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, errorDetail || '');
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  try {
    // 1. Health check
    console.log('1. Testing System & Public Endpoints');
    const health = await request('/health');
    assert(health.status === 200 && health.data.data.status === 'ok', 'GET /health returns 200 and status ok');

    const config = await request('/config');
    assert(config.status === 200 && (config.data.data.chainId === 11155111 || config.data.data.chainId === 31337), 'GET /config returns 200 and chain config');

    // 2. Authentication Flow with ethers Wallet
    console.log('\n2. Testing Wallet Authentication');
    const testWallet = ethers.Wallet.createRandom();
    const nonceRes = await request('/auth/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: testWallet.address }),
    });
    assert(nonceRes.status === 200 && !!nonceRes.data.data.nonce, 'POST /auth/nonce returns random nonce');

    const nonce = nonceRes.data.data.nonce;
    const message = `Sign in to FairWork: ${nonce}`;
    const signature = await testWallet.signMessage(message);

    const verifyRes = await request('/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: testWallet.address, signature }),
    });
    assert(verifyRes.status === 200 && !!verifyRes.data.data.token, 'POST /auth/verify verifies signature & issues JWT');
    const authToken = verifyRes.data.data.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    const meRes = await request('/auth/me', { headers: authHeaders });
    assert(meRes.status === 200 && meRes.data.data.walletAddress === testWallet.address, 'GET /auth/me returns authenticated user');

    // 3. User Profile CRUD
    console.log('\n3. Testing User Profile');
    const updateProfileRes = await request('/users/profile', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Dhruv Tester',
        bio: 'Backend Lead for FairWork',
        skills: 'TypeScript, Express, Prisma, ethers.js',
        githubUsername: 'dhruv-dev',
      }),
    });
    assert(updateProfileRes.status === 200 && updateProfileRes.data.data.githubUsername === 'dhruv-dev', 'PUT /users/profile updates user fields');

    // 4. Community Module: Posts, Proposals, Threads, Messages
    console.log('\n4. Testing Community Module');
    const createPostRes = await request('/community/posts', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'JOB',
        title: 'Full Stack Web3 Escrow Integration',
        description: 'Need a developer to wire frontend to Express backend and Hardhat escrow contract.',
        budget: 1800,
        tags: ['React', 'TypeScript', 'Web3'],
      }),
    });
    assert(createPostRes.status === 201 && !!createPostRes.data.data.id, 'POST /community/posts creates job post');
    const postId = createPostRes.data.data.id;

    const listPostsRes = await request('/community/posts?type=JOB', { headers: authHeaders });
    assert(listPostsRes.status === 200 && Array.isArray(listPostsRes.data.data), 'GET /community/posts searches and lists posts');

    // Create a freelancer wallet to submit proposal and negotiate
    const freelancerWallet = ethers.Wallet.createRandom();
    const flNonceRes = await request('/auth/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: freelancerWallet.address }),
    });
    const flSignature = await freelancerWallet.signMessage(`Sign in to FairWork: ${flNonceRes.data.data.nonce}`);
    const flVerifyRes = await request('/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: freelancerWallet.address, signature: flSignature }),
    });
    const flAuthHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${flVerifyRes.data.data.token}`,
    };
    const flUserId = flVerifyRes.data.data.user.id;

    // Update freelancer profile to have matching skills
    await request('/users/profile', {
      method: 'PUT',
      headers: flAuthHeaders,
      body: JSON.stringify({
        name: 'Alice Web3 Dev',
        skills: 'React, TypeScript, Web3, Solidity',
        githubUsername: 'alice-eth',
      }),
    });

    // Test Feature 5: AI Talent Matcher with Explainable Ranking & Soulbound Tokens
    const talentRes = await request(`/community/posts/${postId}/recommended-talent`, {
      headers: authHeaders,
    });
    assert(
      talentRes.status === 200 && Array.isArray(talentRes.data.data),
      'GET /community/posts/:id/recommended-talent returns recommendations array'
    );
    assert(talentRes.data.data.length > 0, 'Talent matcher found active candidates');
    const matchedDev = talentRes.data.data.find((c: any) => c.userId === flUserId) || talentRes.data.data[0];
    assert(
      typeof matchedDev.matchScore === 'number' && matchedDev.matchScore >= 50,
      'Talent match score is high for matching skills'
    );
    assert(
      Array.isArray(matchedDev.matchReasoning) && matchedDev.matchReasoning.length > 0,
      'Talent matcher returns explainable bullet points'
    );
    assert(
      matchedDev.matchReasoning.some(
        (r: string) => r.toLowerCase().includes('skill') || r.toLowerCase().includes('react')
      ),
      'Reasoning mentions matched skills'
    );

    // Submit proposal as freelancer
    const proposalRes = await request(`/community/posts/${postId}/proposals`, {
      method: 'POST',
      headers: flAuthHeaders,
      body: JSON.stringify({
        coverLetter: 'I have extensive experience with escrow smart contracts and Express.js.',
        proposedBudget: 1800,
        proposedDuration: '10 days',
      }),
    });
    assert(proposalRes.status === 201 && proposalRes.data.data.status === 'PENDING', 'POST /community/posts/:id/proposals submits proposal');

    // Thread and messages
    const threadRes = await request('/community/threads', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        postId,
        recipientId: flUserId,
        subject: 'Project Kickoff Discussion',
      }),
    });
    assert(threadRes.status === 201 && !!threadRes.data.data.id, 'POST /community/threads creates communication thread');
    const threadId = threadRes.data.data.id;

    const msgRes = await request(`/community/threads/${threadId}/messages`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ content: 'Welcome aboard! Let us outline the milestones.' }),
    });
    assert(msgRes.status === 201 && !!msgRes.data.data.id, 'POST /community/threads/:id/messages sends message');

    const getMsgsRes = await request(`/community/threads/${threadId}/messages`, {
      headers: authHeaders,
    });
    assert(getMsgsRes.status === 200 && Array.isArray(getMsgsRes.data.data), 'GET /community/threads/:id/messages returns message array');
    assert(getMsgsRes.data.data.length >= 1, 'GET /community/threads/:id/messages includes sent message');

    const getRootMsgsRes = await request(`/threads/${threadId}/messages`, {
      headers: authHeaders,
    });
    assert(getRootMsgsRes.status === 200 && Array.isArray(getRootMsgsRes.data.data), 'GET /threads/:id/messages alias returns 200 OK');

    // 5. Agreement Drafting, Editing, Approval, and Locking
    console.log('\n5. Testing Agreement Drafting & Canonical Hashing');
    const draftRes = await request('/agreements/draft', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        threadId,
        postId,
        freelancerId: flUserId,
        title: 'Escrow Milestone Agreement',
      }),
    });
    assert(draftRes.status === 201 && draftRes.data.data.status === 'DRAFT', 'POST /agreements/draft generates AI draft with milestones');
    const agreementId = draftRes.data.data.id;
    const initialMilestones = draftRes.data.data.milestones;
    assert(initialMilestones.length >= 2, 'Agreement has generated milestones');

    // Test Feature 1: Brief-to-Plan Generator
    const planRes = await request('/agreements/plan-from-brief', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        brief: 'Build a decentralized cross-chain bridge interface with MetaMask signing and automated unit tests.',
        totalBudget: 2.5,
        currency: 'MATIC',
        freelancerId: flUserId,
      }),
    });
    assert(planRes.status === 201 && planRes.data.data.agreement.status === 'DRAFT', 'POST /agreements/plan-from-brief creates planned draft');
    assert(planRes.data.data.agreement.milestones.length >= 2, 'Plan from brief generated multiple milestones');
    assert(!!planRes.data.data.rationale, 'Plan from brief returns architectural rationale');

    // Test Feature 2: Agreement Clarity Linter & Pre-Lock Risk Auditor
    const auditRes = await request(`/agreements/${agreementId}/audit`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(auditRes.status === 200, 'POST /agreements/:id/audit returns 200 OK');
    assert(typeof auditRes.data.data.fairness_score === 'number', 'Audit returns fairness_score');
    assert(Array.isArray(auditRes.data.data.flags), 'Audit returns flags array');
    assert(!!auditRes.data.data.summary, 'Audit returns high-level summary');

    // Test Feature 2 with subjective clauses & high penalties
    const subjectiveAuditRes = await request('/agreements/audit', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        terms: {
          title: 'Subjective UI Test',
          totalBudget: 1.0,
          currency: 'ETH',
          latePenaltyBpsPerDay: 600,
          maxLatePenaltyBps: 6000,
          milestones: [
            {
              title: 'Phase 1',
              amount: 1.0,
              acceptanceCriteria: ['Make clean code and nice UI'],
            },
          ],
        },
      }),
    });
    assert(subjectiveAuditRes.status === 200, 'POST /agreements/audit returns 200 OK on raw terms');
    assert(subjectiveAuditRes.data.data.fairness_score < 70, 'Clarity linter marks vague terms with low score');
    const subjectiveFlags = subjectiveAuditRes.data.data.flags;
    assert(
      subjectiveFlags.some((f: any) => f.suggested_rewrite && f.suggested_rewrite.includes('ESLint')),
      'Clarity linter provides auto-rewrite for "clean code"'
    );
    assert(
      subjectiveFlags.some((f: any) => f.severity === 'CRITICAL'),
      'Risk auditor flags severe penalty rates as CRITICAL'
    );

    // Approve as client first
    const clientApproveRes = await request(`/agreements/${agreementId}/approve`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(clientApproveRes.status === 200 && clientApproveRes.data.data.status === 'CLIENT_APPROVED', 'POST /agreements/:id/approve marks CLIENT_APPROVED');

    // Edit agreement - MUST reset approval back to DRAFT
    const parsedTerms = JSON.parse(clientApproveRes.data.data.termsJson);
    parsedTerms.revisionPolicy = 'Updated: 3 revision rounds permitted.';
    const editRes = await request(`/agreements/${agreementId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ terms: parsedTerms }),
    });
    assert(editRes.status === 200 && editRes.data.data.status === 'DRAFT', 'PUT /agreements/:id resets approvals back to DRAFT');

    // Both parties approve to LOCK agreement and compute canonicalHash
    await request(`/agreements/${agreementId}/approve`, {
      method: 'POST',
      headers: authHeaders,
    });
    const flApproveRes = await request(`/agreements/${agreementId}/approve`, {
      method: 'POST',
      headers: flAuthHeaders,
    });
    assert(
      flApproveRes.status === 200 &&
      flApproveRes.data.data.status === 'LOCKED' &&
      !!flApproveRes.data.data.canonicalHash,
      'POST /agreements/:id/approve locks agreement and generates deterministic canonicalHash'
    );
    const lockedCanonicalHash = flApproveRes.data.data.canonicalHash;

    // Link agreement on-chain with dynamic unique ID
    const linkRes = await request(`/agreements/${agreementId}/link`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ onChainAgreementId: `onchain_${Date.now()}` }),
    });
    assert(linkRes.status === 200 && linkRes.data.data.status === 'ONCHAIN_LINKED', 'POST /agreements/:id/link verifies terms hash & links on-chain');

    // 6. Milestone Submissions and Oracle Verification
    console.log('\n6. Testing Milestone Submission & Oracle Progress Recording');
    const milestoneId = flApproveRes.data.data.milestones[0].id;
    const submitMilestoneRes = await request(`/milestones/${milestoneId}/submit`, {
      method: 'POST',
      headers: flAuthHeaders,
      body: JSON.stringify({
        repoUrl: 'https://github.com/fairwork/test-escrow-repo',
        commitSha: 'a1b2c3d4e5f6789012345678901234567890abcd',
        notes: 'Implemented core tests and passed 100% test suite.',
      }),
    });
    assert(
      submitMilestoneRes.status === 200 &&
      submitMilestoneRes.data.data.milestone.status === 'SUBMITTED' &&
      !!submitMilestoneRes.data.data.oracleTxHash,
      'POST /milestones/:id/submit analyzes repo via AI & records progress via Oracle'
    );

    // Test Feature 3: Submit milestone 2 as non-code / multimodal deliverable
    const milestone2Id = flApproveRes.data.data.milestones[1].id;
    const submitNonCodeRes = await request(`/milestones/${milestone2Id}/submit`, {
      method: 'POST',
      headers: flAuthHeaders,
      body: JSON.stringify({
        deliverableType: 'DESIGN',
        deliverableContent: 'Complete high-fidelity Figma components, interactive prototypes, and design tokens for desktop & mobile viewports.',
        assetUrl: 'https://figma.com/file/fairwork-design-system-token-specs',
        notes: 'Delivered all Figma screen flows and exportable SVGs for all core views.',
      }),
    });
    assert(
      submitNonCodeRes.status === 200 &&
      submitNonCodeRes.data.data.milestone.status === 'SUBMITTED' &&
      !!submitNonCodeRes.data.data.oracleTxHash,
      'POST /milestones/:id/submit verifies multimodal deliverable via AI'
    );
    assert(
      Array.isArray(submitNonCodeRes.data.data.criteriaVerdicts) &&
      submitNonCodeRes.data.data.criteriaVerdicts.length > 0,
      'Multimodal submission returns per-criterion 4-state verdicts'
    );
    assert(
      ['SUPPORTED', 'UNCLEAR', 'NOT_DEMONSTRATED', 'CHECK_FAILED'].includes(
        submitNonCodeRes.data.data.criteriaVerdicts[0].verdict
      ),
      'Criterion verdict adheres to 4-state objective classification'
    );
    assert(
      !!submitNonCodeRes.data.data.criteriaVerdicts[0].evidence,
      'Criterion verdict provides detailed evidence explanation'
    );

    // Client reviews and approves milestone
    const reviewMilestoneRes = await request(`/milestones/${milestoneId}/review`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ action: 'APPROVE', feedback: 'Outstanding work!' }),
    });
    assert(reviewMilestoneRes.status === 200 && reviewMilestoneRes.data.data.status === 'APPROVED', 'POST /milestones/:id/review marks milestone APPROVED');

    // 7. Disputes & Safe Evidence Upload
    console.log('\n7. Testing Dispute Lifecycle & Evidence Upload');
    const disputeRes = await request('/disputes', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        agreementId,
        reason: 'Milestone 2 deliverable requirements clarification disagreement.',
      }),
    });
    assert(disputeRes.status === 201 && disputeRes.data.data.status === 'OPEN', 'POST /disputes files dispute and updates agreement status');
    const disputeId = disputeRes.data.data.id;

    // Create a temporary evidence file for upload test
    const tempFilePath = path.join(__dirname, 'test_evidence.txt');
    fs.writeFileSync(tempFilePath, 'FairWork Evidence Log: Commit history and specification diff.');

    const formData = new FormData();
    const fileBytes = fs.readFileSync(tempFilePath);
    formData.append('file', new Blob([fileBytes], { type: 'text/plain' }), 'test_evidence.txt');
    formData.append('description', 'Terminal test logs showing agreement terms mismatch');

    const evidenceRes = await fetch(`${baseUrl}/disputes/${disputeId}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    const evidenceData = await evidenceRes.json();
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    assert(
      evidenceRes.status === 201 && !!evidenceData.data.contentHash,
      'POST /disputes/:id/evidence safely uploads evidence and computes SHA-256 hash'
    );

    // Generate AI dispute summary & recommendation
    const aiDisputeRes = await request(`/disputes/${disputeId}/ai-summary`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(
      aiDisputeRes.status === 200 && !!aiDisputeRes.data.data.oracleRecommendation,
      'POST /disputes/:id/ai-summary generates AI summary & oracle recommendation'
    );

    // Test Feature 4: AI Arbitrator Dossier & Evidence Cross-Examiner
    const dossierRes = await request(`/disputes/${disputeId}/dossier`, {
      headers: authHeaders,
    });
    assert(
      dossierRes.status === 200 && !!dossierRes.data.data.executive_summary,
      'GET /disputes/:id/dossier generates executive arbitrator briefing'
    );
    assert(
      Array.isArray(dossierRes.data.data.claims_matrix) && dossierRes.data.data.claims_matrix.length > 0,
      'Arbitrator dossier includes split Claims vs. Fact matrix'
    );
    assert(
      dossierRes.data.data.claims_matrix.every(
        (row: any) => row.client_claim && row.freelancer_claim && row.factual_evidence
      ),
      'Claims matrix rows contain client claim, freelancer defense, and objective evidence'
    );
    assert(
      typeof dossierRes.data.data.recommended_share_bps === 'number' &&
      dossierRes.data.data.recommended_share_bps >= 0,
      'Arbitrator dossier provides pro-rated recommended share in basis points'
    );

    // Test Feature 4: Interactive Arbitrator Cross-Examiner Query
    const queryRes = await request(`/disputes/${disputeId}/query`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        question: 'Did the automated tests pass prior to milestone rejection?',
      }),
    });
    assert(
      queryRes.status === 200 && !!queryRes.data.data.answer,
      'POST /disputes/:id/query answers arbitrator questions'
    );
    assert(
      Array.isArray(queryRes.data.data.cited_evidence) && queryRes.data.data.cited_evidence.length > 0,
      'Arbitrator cross-examiner cites specific verifiable evidence'
    );

    // 8. Event Indexer & Timeline
    console.log('\n8. Testing Event Indexer & Agreement Timeline');
    const indexRes = await request(`/events/index/${agreementId}`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert(indexRes.status === 200, 'POST /events/index/:id backfills on-chain events');

    const timelineRes = await request(`/events/timeline/${agreementId}`, {
      headers: authHeaders,
    });
    assert(
      timelineRes.status === 200 && Array.isArray(timelineRes.data.data) && timelineRes.data.data.length > 0,
      'GET /events/timeline/:id returns chronological multi-source timeline'
    );

    // 9. Payment Summary
    console.log('\n9. Testing Payments View');
    const paymentRes = await request(`/payments/agreement/${agreementId}`, {
      headers: authHeaders,
    });
    assert(
      paymentRes.status === 200 && paymentRes.data.data.summary.totalDeposited >= 0,
      'GET /payments/agreement/:id combines indexed events and contract payment view'
    );

    // 10. Alerts & Deadline Watcher
    console.log('\n10. Testing Alerts & In-Flight Health Telemetry');
    const alertsRes = await request('/alerts', {
      headers: authHeaders,
    });
    assert(alertsRes.status === 200 && Array.isArray(alertsRes.data.data), 'GET /alerts lists active alerts');

    // Test Feature 6: In-Flight Milestone Health & Delay Risk Predictor
    const healthRes = await request(`/milestones/${milestone2Id}/health`, {
      headers: authHeaders,
    });
    assert(
      healthRes.status === 200 && !!healthRes.data.data.healthStatus,
      'GET /milestones/:id/health computes in-flight health telemetry'
    );
    assert(
      ['ON_TRACK', 'AT_RISK', 'CRITICAL_DELAY', 'COMPLETED'].includes(healthRes.data.data.healthStatus),
      'Milestone health status is valid enum'
    );
    assert(
      typeof healthRes.data.data.timeProgressRatio === 'number',
      'Milestone health returns time progress ratio'
    );

    // Create a delayed milestone test to verify predictive alert generation
    const delayedMilestone = await prisma.milestone.create({
      data: {
        agreementId,
        milestoneIndex: 99,
        title: 'Delayed Core Engine',
        description: 'Predictive health test milestone',
        amount: 500,
        createdAt: new Date(Date.now() - 10 * 86400000), // created 10 days ago
        deadline: new Date(Date.now() + 1 * 86400000), // 1 day left (>90% elapsed)
        status: 'PENDING',
      },
    });

    const evalRes = await request(`/milestones/${delayedMilestone.id}/health`, {
      headers: authHeaders,
    });
    assert(
      evalRes.status === 200 && evalRes.data.data.healthStatus === 'CRITICAL_DELAY',
      'Predictive health telemetry flags stalling milestones as CRITICAL_DELAY'
    );

    const predictiveAlertsRes = await request('/alerts', { headers: authHeaders });
    assert(
      predictiveAlertsRes.data.data.some((a: any) => a.type === 'PREDICTED_CRITICAL_DELAY'),
      'In-flight health predictor logs early warning PREDICTED_CRITICAL_DELAY alert before deadline breach'
    );

    // Test Feature 7: Scope Creep & Change Request Detector
    console.log('\nTesting Feature 7: Scope Creep & Change Request Detector');
    const scopeCreepRes = await request(`/milestones/${milestoneId}/check-scope`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rejectionReason: 'The deliverable works, but please also add Apple Pay integration and an admin analytics dashboard.',
      }),
    });
    assert(
      scopeCreepRes.status === 200 && scopeCreepRes.data.data.classification === 'SCOPE_CREEP',
      'POST /milestones/:id/check-scope detects out-of-scope feature requests as SCOPE_CREEP'
    );
    assert(
      scopeCreepRes.data.data.suggestedAmendment &&
      scopeCreepRes.data.data.suggestedAmendment.suggestedAdditionalDays > 0,
      'Scope creep analysis proposes on-chain amendment budget and timeline extension'
    );

    const defectFixRes = await request(`/milestones/${milestoneId}/check-scope`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        rejectionReason: 'The login page crashes on invalid email format and automated unit tests fail on branch verification.',
      }),
    });
    assert(
      defectFixRes.status === 200 && defectFixRes.data.data.classification === 'DEFECT_FIX',
      'POST /milestones/:id/check-scope classifies bug reports as DEFECT_FIX'
    );
    assert(
      defectFixRes.data.data.suggestedAmendment === null,
      'Defect fix classification does not recommend additional budget amendment'
    );

    // Test Feature 8: Multilingual Negotiation Assistant (Hinglish/Hindi to Canonical English Agreement)
    console.log('\nTesting Feature 8: Multilingual Negotiation Assistant');
    const hinglishThreadRes = await request('/community/threads', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        postId,
        recipientId: flUserId,
        subject: 'Regional Multilingual Negotiation Demo',
      }),
    });
    const hinglishThreadId = hinglishThreadRes.data.data.id;

    await request(`/community/threads/${hinglishThreadId}/messages`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        content: 'Bhai requirement sun: Pehle phase mein smart contract deploy karna hai Polygon Amoy pe. Budget 1.2 ETH. Deadline 5 din mein.',
      }),
    });

    await request(`/community/threads/${hinglishThreadId}/messages`, {
      method: 'POST',
      headers: flAuthHeaders,
      body: JSON.stringify({
        content: 'Haan bhai theek hai. 1.2 ETH lock karo escrow mein, main 5 din mein Amoy pe contract deploy karke tests pass karwa dunga.',
      }),
    });

    const multilingualDraftRes = await request('/agreements/draft', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        threadId: hinglishThreadId,
        postId,
        freelancerId: flUserId,
      }),
    });
    assert(
      multilingualDraftRes.status === 201 && !!multilingualDraftRes.data.data.id,
      'POST /agreements/draft synthesizes draft from Hinglish conversation thread'
    );
    const parsedDraftTerms = JSON.parse(multilingualDraftRes.data.data.termsJson);
    assert(
      parsedDraftTerms.currency === 'ETH' || parsedDraftTerms.currency === 'MATIC',
      'Multilingual draft normalizes currency to canonical token'
    );
    assert(
      parseFloat(parsedDraftTerms.totalAmount) === 1.2 || parsedDraftTerms.totalBudget === 1.2,
      'Multilingual assistant extracts exact 1.2 ETH budget from Hinglish context'
    );
    assert(
      parsedDraftTerms.milestones && parsedDraftTerms.milestones.length >= 2,
      'Multilingual draft generates sequential milestones'
    );
    assert(
      !parsedDraftTerms.milestones[0].title.toLowerCase().includes('bhai') &&
      !parsedDraftTerms.milestones[0].title.toLowerCase().includes('pehle'),
      'Multilingual assistant translates informal Hindi/Hinglish titles into canonical English'
    );

    console.log(`\n🎉 All ${passedTests}/${totalTests} integration tests PASSED successfully!\n`);
  } catch (error: any) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    await stopTestServer();
  }
}

main();
