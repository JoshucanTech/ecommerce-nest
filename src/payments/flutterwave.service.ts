
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FlutterwaveService {
  private flw: any;

  constructor(private configService: ConfigService) {
    this.initializeFlutterwave();
  }

  private async initializeFlutterwave() {
    const publicKey = this.configService.get<string>('FLUTTERWAVE_PUBLIC_KEY');
    const secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');

    if (!publicKey || !secretKey) {
      throw new InternalServerErrorException(
        'Flutterwave API keys are not configured.',
      );
    }

    const Flutterwave = await import('flutterwave-node-v3');
    this.flw = new Flutterwave(publicKey, secretKey);
  }


  async initiatePayment(amount: number, currency: string, email: string, tx_ref: string, redirect_url: string, meta?: any) {
    try {
      const payload = {
        tx_ref: tx_ref,
        amount: amount.toString(),
        currency: currency,
        redirect_url: redirect_url,
        customer: {
          email: email,
        },
        meta: meta,
        customizations: {
          title: 'E-commerce Payment',
          description: 'Payment for your order',
        },
      };
      const response = await this.flw.Payment.initiate(payload);
      return response;
    } catch (error) {
      console.error('Flutterwave initiation error:', error);
      throw new InternalServerErrorException('Failed to initiate Flutterwave payment');
    }
  }

  async verifyPayment(transaction_id: string) {
    try {
      const response = await this.flw.Transaction.verify({
        id: transaction_id,
      });
      return response;
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw new InternalServerErrorException('Failed to verify Flutterwave payment');
    }
  }
}
