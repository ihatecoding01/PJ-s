import { ethers } from 'ethers';
import { env } from '../config/env';
import fairWorkAbi from '../contracts/FairWorkABI.json';
import deploymentConfig from '../contracts/deployment.json';

export interface PaymentSummaryResult {
  totalDeposited: number;
  totalReleased: number;
  totalRefunded: number;
  currency: string;
}

export interface ChainEventItem {
  eventName: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  argsJson: string;
  timestamp: Date;
}

export class ChainAdapter {
  private static provider: ethers.JsonRpcProvider | null = null;
  private static oracleWallet: ethers.Wallet | null = null;

  static getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
    }
    return this.provider;
  }

  static getOracleWallet(): ethers.Wallet {
    if (!this.oracleWallet) {
      this.oracleWallet = new ethers.Wallet(env.ORACLE_PRIVATE_KEY, this.getProvider());
    }
    return this.oracleWallet;
  }

  /**
   * Verifies that the on-chain agreement's termsHash matches the local canonicalHash.
   * If CHAIN_MOCK=true, returns true or validates against mock registry.
   */
  static async verifyTermsHash(
    onChainAgreementId: string,
    expectedCanonicalHash: string
  ): Promise<{ valid: boolean; onChainTermsHash: string }> {
    if (env.CHAIN_MOCK) {
      // In mock mode, deterministic verification:
      // We accept the canonical hash as verified on mock chain.
      return {
        valid: true,
        onChainTermsHash: expectedCanonicalHash,
      };
    }

    try {
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, fairWorkAbi, this.getProvider());
      const onChainData = await contract.getAgreement(onChainAgreementId);
      const onChainTermsHash: string = onChainData.termsHash;

      return {
        valid: onChainTermsHash.toLowerCase() === expectedCanonicalHash.toLowerCase(),
        onChainTermsHash,
      };
    } catch (error: any) {
      console.warn(`[ChainAdapter] Failed to verify terms hash on-chain: ${error.message}`);
      return {
        valid: false,
        onChainTermsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
    }
  }

  /**
   * Records verified milestone progress on-chain using the dedicated ORACLE wallet.
   * Never impersonates the freelancer wallet.
   */
  static async recordProgressThroughOracle(params: {
    agreementId: string;
    milestoneIndex: number;
    canonicalReportHash: string;
    qualityScore: number;
  }): Promise<{ transactionHash: string; blockNumber: number }> {
    if (env.CHAIN_MOCK) {
      const mockTxHash = `0xmock_oracle_progress_${Date.now()}_${Math.random().toString(16).substring(2, 10)}`;
      return {
        transactionHash: mockTxHash,
        blockNumber: 1234567,
      };
    }

    try {
      const wallet = this.getOracleWallet();
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, fairWorkAbi, wallet);

      const tx = await contract.recordProgress(
        params.agreementId,
        params.milestoneIndex,
        params.canonicalReportHash,
        params.qualityScore
      );

      const receipt = await tx.wait();
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error(`[ChainAdapter] Oracle recordProgress error: ${error.message}`);
      throw new Error(`Failed to record progress on chain: ${error.message}`);
    }
  }

  /**
   * Fetches on-chain payment summary view.
   */
  static async getPaymentSummary(onChainAgreementId: string): Promise<PaymentSummaryResult> {
    if (env.CHAIN_MOCK) {
      return {
        totalDeposited: 1000,
        totalReleased: 400,
        totalRefunded: 0,
        currency: 'USDC',
      };
    }

    try {
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, fairWorkAbi, this.getProvider());
      const summary = await contract.getPaymentSummary(onChainAgreementId);
      return {
        totalDeposited: Number(ethers.formatUnits(summary.totalDeposited, 6)),
        totalReleased: Number(ethers.formatUnits(summary.totalReleased, 6)),
        totalRefunded: Number(ethers.formatUnits(summary.totalRefunded, 6)),
        currency: summary.paymentToken || 'USDC',
      };
    } catch (error: any) {
      console.warn(`[ChainAdapter] getPaymentSummary fallback: ${error.message}`);
      return {
        totalDeposited: 0,
        totalReleased: 0,
        totalRefunded: 0,
        currency: 'USDC',
      };
    }
  }

  /**
   * Loads the shared contract configuration and deployment metadata.
   */
  static getConfig() {
    return {
      chainId: env.CHAIN_ID,
      contractAddress: env.CONTRACT_ADDRESS,
      oracleAddress: new ethers.Wallet(env.ORACLE_PRIVATE_KEY).address,
      abi: fairWorkAbi,
      deployment: deploymentConfig,
      chainMock: env.CHAIN_MOCK,
      aiMock: env.AI_MOCK,
    };
  }

  /**
   * Backfills / scans events for an agreement.
   */
  static async backfillEvents(agreementId: string): Promise<ChainEventItem[]> {
    if (env.CHAIN_MOCK) {
      const now = new Date();
      return [
        {
          eventName: 'AgreementCreated',
          transactionHash: `0xmock_event_created_${agreementId.substring(0, 8)}`,
          blockNumber: 100,
          logIndex: 0,
          argsJson: JSON.stringify({ agreementId, termsHash: '0xmock_terms_hash' }),
          timestamp: new Date(now.getTime() - 86400000 * 2),
        },
        {
          eventName: 'FundsDeposited',
          transactionHash: `0xmock_event_deposit_${agreementId.substring(0, 8)}`,
          blockNumber: 105,
          logIndex: 1,
          argsJson: JSON.stringify({ agreementId, amount: 1000 }),
          timestamp: new Date(now.getTime() - 86400000),
        },
      ];
    }

    // In real RPC mode, query filters from contract
    try {
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, fairWorkAbi, this.getProvider());
      const filter = contract.filters.AgreementCreated(agreementId);
      const events = await contract.queryFilter(filter, 0, 'latest');
      return events.map((ev, idx) => ({
        eventName: 'AgreementCreated',
        transactionHash: ev.transactionHash,
        blockNumber: ev.blockNumber,
        logIndex: idx,
        argsJson: JSON.stringify(ev),
        timestamp: new Date(),
      }));
    } catch (err: any) {
      console.warn(`[ChainAdapter] Event backfill warning: ${err.message}`);
      return [];
    }
  }
}
