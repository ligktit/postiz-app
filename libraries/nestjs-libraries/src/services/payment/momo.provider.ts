import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { PaymentEvent, PaymentProvider } from './payment.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import crypto from 'crypto';

export class MomoProvider implements PaymentProvider {
  identifier = 'momo';

  async createCheckout(
    ud: string,
    uniqueId: string,
    customer: string,
    body: BillingSubscribeDto,
    price: string,
    userId: string,
    allowTrial: boolean
  ): Promise<{ url?: string; client_secret?: string }> {
    const partnerCode = process.env.MOMO_PARTNER_CODE!;
    const accessKey = process.env.MOMO_ACCESS_KEY!;
    const secretKey = process.env.MOMO_SECRET_KEY!;
    const envUrl = process.env.MOMO_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const redirectUrl = process.env.FRONTEND_URL + `/launches?onboarding=true&check=${uniqueId}`;
    const ipnUrl = process.env.BACKEND_URL + `/billing/momo-ipn`; // We'll set this up later

    const amount = body.period === 'MONTHLY' ? '299000' : '2990000';
    const orderId = makeId(15);
    const requestId = orderId;
    const orderInfo = `Thanh toan LightCircle ${body.billing} ${body.period}`;
    const requestType = 'captureWallet';
    const extraData = '';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: 'LightCircle',
      storeId: 'MomoTestStore',
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    });

    try {
      const response = await fetch(envUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      const data = await response.json();
      if (data.payUrl) {
        return { url: data.payUrl };
      }
    } catch (error) {
      console.error('Momo checkout error:', error);
    }
    
    return { url: redirectUrl }; // Fallback
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string,
    endpointSecret?: string
  ): Promise<PaymentEvent> {
    const payload = JSON.parse(rawBody.toString('utf-8'));
    const secretKey = process.env.MOMO_SECRET_KEY!;

    // Reconstruct signature
    const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY!}&amount=${payload.amount}&extraData=${payload.extraData}&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}&requestId=${payload.requestId}&responseTime=${payload.responseTime}&resultCode=${payload.resultCode}&transId=${payload.transId}`;
    
    const checkSignature = crypto
        .createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');

    if (payload.signature === checkSignature && payload.resultCode === 0) {
      return {
        ok: true,
        type: 'created',
        customerId: payload.orderId,
      };
    } else {
      return { ok: false, type: 'failed', customerId: '' };
    }
  }

  async cancelSubscription(customerId: string): Promise<{ cancel_at: Date }> {
    return { cancel_at: new Date() };
  }

  async createOrGetCustomer(name: string, email: string, paymentId?: string | null): Promise<string> {
    return paymentId || makeId(15);
  }
}
