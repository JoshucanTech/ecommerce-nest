import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FlutterwaveService {
  private flw: any;
  private publicKey: string;
  private secretKey: string;

  constructor(private configService: ConfigService) {
    this.publicKey = this.configService.get<string>('FLUTTERWAVE_PUBLIC_KEY');
    this.secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');

    if (!this.publicKey || !this.secretKey) {
      throw new InternalServerErrorException(
        'Flutterwave API keys are not configured.',
      );
    }

    // Initialize Flutterwave immediately
    this.initializeFlutterwave();
  }

  private initializeFlutterwave() {
    try {
      // Import Flutterwave module
      import('flutterwave-node-v3')
        .then((FlutterwaveModule) => {
          // Get the constructor (might be default export or named export)
          const Flutterwave = FlutterwaveModule.default || FlutterwaveModule;
          // Initialize the Flutterwave instance
          this.flw = new Flutterwave(this.publicKey, this.secretKey);
        })
        .catch((error) => {
          console.error('Flutterwave initialization error:', error);
        });
    } catch (error) {
      console.error('Flutterwave initialization error:', error);
    }
  }

  async verifyPayment(transaction_id: string) {
    // Ensure Flutterwave SDK is initialized
    if (!this.flw) {
      // Try to initialize again
      this.initializeFlutterwave();
      // Wait a bit for initialization
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!this.flw) {
      throw new InternalServerErrorException(
        'Flutterwave SDK is not initialized',
      );
    }

    try {
      // Check if Transaction module exists
      if (!this.flw.Transaction) {
        throw new Error('Flutterwave Transaction module is not available');
      }
      
      const response = await this.flw.Transaction.verify({
        id: transaction_id,
      });
      return response;
    } catch (error) {
      console.error('Flutterwave verification error:', {
        error,
        message: error.message,
        stack: error.stack
      });
      throw new InternalServerErrorException(
        'Failed to verify Flutterwave payment: ' + (error.message || error),
      );
    }
  }
  
  // Simple method to check if service is ready
  isReady(): boolean {
    return !!this.flw;
  }
}