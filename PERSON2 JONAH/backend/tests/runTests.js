"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../src/app");
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Helper to make fetch requests against in-memory express server
let server;
let baseUrl = '';
async function startTestServer() {
    const app = (0, app_1.createApp)();
    return new Promise((resolve) => {
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
async function request(endpoint, options = {}) {
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
    function assert(condition, testName, errorDetail) {
        totalTests++;
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passedTests++;
        }
        else {
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
        assert(config.status === 200 && config.data.data.chainId === 31337, 'GET /config returns 200 and chain config');
        // 2. Authentication Flow with ethers Wallet
        console.log('\n2. Testing Wallet Authentication');
        const testWallet = ethers_1.ethers.Wallet.createRandom();
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
        const freelancerWallet = ethers_1.ethers.Wallet.createRandom();
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
        assert(flApproveRes.status === 200 &&
            flApproveRes.data.data.status === 'LOCKED' &&
            !!flApproveRes.data.data.canonicalHash, 'POST /agreements/:id/approve locks agreement and generates deterministic canonicalHash');
        const lockedCanonicalHash = flApproveRes.data.data.canonicalHash;
        // Link agreement on-chain
        const linkRes = await request(`/agreements/${agreementId}/link`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ onChainAgreementId: '42' }),
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
        assert(submitMilestoneRes.status === 200 &&
            submitMilestoneRes.data.data.milestone.status === 'SUBMITTED' &&
            !!submitMilestoneRes.data.data.oracleTxHash, 'POST /milestones/:id/submit analyzes repo via AI & records progress via Oracle');
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
        const tempFilePath = path_1.default.join(__dirname, 'test_evidence.txt');
        fs_1.default.writeFileSync(tempFilePath, 'FairWork Evidence Log: Commit history and specification diff.');
        const formData = new FormData();
        const fileBytes = fs_1.default.readFileSync(tempFilePath);
        formData.append('file', new Blob([fileBytes], { type: 'text/plain' }), 'test_evidence.txt');
        formData.append('description', 'Terminal test logs showing agreement terms mismatch');
        const evidenceRes = await fetch(`${baseUrl}/disputes/${disputeId}/evidence`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}` },
            body: formData,
        });
        const evidenceData = await evidenceRes.json();
        if (fs_1.default.existsSync(tempFilePath))
            fs_1.default.unlinkSync(tempFilePath);
        assert(evidenceRes.status === 201 && !!evidenceData.data.contentHash, 'POST /disputes/:id/evidence safely uploads evidence and computes SHA-256 hash');
        // Generate AI dispute summary & recommendation
        const aiDisputeRes = await request(`/disputes/${disputeId}/ai-summary`, {
            method: 'POST',
            headers: authHeaders,
        });
        assert(aiDisputeRes.status === 200 && !!aiDisputeRes.data.data.oracleRecommendation, 'POST /disputes/:id/ai-summary generates AI summary & oracle recommendation');
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
        assert(timelineRes.status === 200 && Array.isArray(timelineRes.data.data) && timelineRes.data.data.length > 0, 'GET /events/timeline/:id returns chronological multi-source timeline');
        // 9. Payment Summary
        console.log('\n9. Testing Payments View');
        const paymentRes = await request(`/payments/agreement/${agreementId}`, {
            headers: authHeaders,
        });
        assert(paymentRes.status === 200 && paymentRes.data.data.summary.totalDeposited >= 0, 'GET /payments/agreement/:id combines indexed events and contract payment view');
        // 10. Alerts & Deadline Watcher
        console.log('\n10. Testing Alerts & Deadline Watcher');
        const alertsRes = await request('/alerts', {
            headers: authHeaders,
        });
        assert(alertsRes.status === 200 && Array.isArray(alertsRes.data.data), 'GET /alerts lists active alerts');
        console.log(`\n🎉 All ${passedTests}/${totalTests} integration tests PASSED successfully!\n`);
    }
    catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
    finally {
        await stopTestServer();
    }
}
main();
