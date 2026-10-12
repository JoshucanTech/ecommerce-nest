import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);
  private flw: any;
  private publicKey: string;
  private secretKey: string;

  constructor(private configService: ConfigService) {
    this.publicKey = this.configService.get<string>('FLUTTERWAVE_PUBLIC_KEY') || '';
    this.secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY') || '';

    if (!this.publicKey || !this.secretKey) {
      this.logger.warn('Flutterwave API keys are not fully configured in environment.');
    } else {
      this.initializeFlutterwave();
    }
  }

  private initializeFlutterwave() {
    try {
      // Synchronously require the commonjs flutterwave-node-v3 SDK
      const Flutterwave = require('flutterwave-node-v3');
      this.flw = new Flutterwave(this.publicKey, this.secretKey);
      this.logger.log('Flutterwave SDK initialized successfully.');
    } catch (error) {
      this.logger.error('Flutterwave SDK initialization error:', error);
    }
  }

  /**
   * Verify payment using transaction ID (numeric ID from Flutterwave)
   */
  async verifyPayment(transactionId: string | number) {
    if (!this.flw && this.publicKey && this.secretKey) {
      this.initializeFlutterwave();
    }

    // Try verifying with official SDK first
    if (this.flw?.Transaction?.verify) {
      try {
        const response = await this.flw.Transaction.verify({
          id: String(transactionId),
        });
        if (response) {
          return response;
        }
      } catch (sdkError) {
        this.logger.warn(`SDK verification by ID failed, trying REST API fallback: ${sdkError.message || sdkError}`);
      }
    }

    // Fallback directly to Flutterwave REST API
    try {
      const { data } = await axios.get(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return data;
    } catch (apiError) {
      this.logger.error(`Direct API verification by ID failed: ${apiError.message || apiError}`);
      throw new Error(`Failed to verify payment with transaction ID ${transactionId}: ${apiError.response?.data?.message || apiError.message}`);
    }
  }

  /**
   * Verify payment using tx_ref (custom transaction reference)
   */
  async verifyPaymentByTxRef(txRef: string) {
    if (!this.flw && this.publicKey && this.secretKey) {
      this.initializeFlutterwave();
    }

    // Try verifying with official SDK first
    if (this.flw?.Transaction?.verify_by_tx) {
      try {
        const response = await this.flw.Transaction.verify_by_tx({
          tx_ref: txRef,
        });
        if (response) {
          return response;
        }
      } catch (sdkError) {
        this.logger.warn(`SDK verification by tx_ref failed, trying REST API fallback: ${sdkError.message || sdkError}`);
      }
    }

    // Fallback directly to Flutterwave REST API
    try {
      const { data } = await axios.get(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return data;
    } catch (apiError) {
      this.logger.error(`Direct API verification by tx_ref failed: ${apiError.message || apiError}`);
      throw new Error(`Failed to verify payment with tx_ref ${txRef}: ${apiError.response?.data?.message || apiError.message}`);
    }
  }

  isReady(): boolean {
    return !!this.flw || !!this.secretKey;
  }
}
