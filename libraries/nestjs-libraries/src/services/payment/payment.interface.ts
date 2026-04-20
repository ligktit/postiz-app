import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';

export interface PaymentEvent {
  ok: boolean;
  type: 'created' | 'updated' | 'deleted' | 'failed';
  customerId: string;
  uniqueId?: string;
  billing?: 'STANDARD' | 'PRO' | 'ULTIMATE';
  period?: 'MONTHLY' | 'YEARLY';
  cancelAt?: Date | null;
}

export interface PaymentProvider {
  identifier: string;

  /**
   * Initializes a checkout session and returns a checkout URL or client secret
   */
  createCheckout(
    ud: string,
    uniqueId: string,
    customer: string,
    body: BillingSubscribeDto,
    price: string, // Internal price identifier or amount
    userId: string,
    allowTrial: boolean
  ): Promise<{ url?: string; client_secret?: string }>;

  /**
   * Validates and handles provider-specific webhooks/IPN calls
   */
  handleWebhook(
    rawBody: Buffer,
    signature: string,
    endpointSecret?: string
  ): Promise<PaymentEvent>;

  /**
   * Cancels an active subscription
   */
  cancelSubscription(customerId: string): Promise<{ cancel_at: Date }>;

  /**
   * Creates or returns a gateway-specific customer ID
   */
  createOrGetCustomer(name: string, email: string, paymentId?: string | null): Promise<string>;
}
