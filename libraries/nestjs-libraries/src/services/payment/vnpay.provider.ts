import { BillingSubscribeDto } from '@gitroom/nestjs-libraries/dtos/billing/billing.subscribe.dto';
import { PaymentEvent, PaymentProvider } from './payment.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import crypto from 'crypto';
import dayjs from 'dayjs';

export class VnpayProvider implements PaymentProvider {
  identifier = 'vnpay';

  async createCheckout(
    ud: string,
    uniqueId: string,
    customer: string,
    body: BillingSubscribeDto,
    price: string,
    userId: string,
    allowTrial: boolean
  ): Promise<{ url?: string; client_secret?: string }> {
    const tmnCode = process.env.VNPAY_TMN_CODE!;
    const secretKey = process.env.VNPAY_HASH_SECRET!;
    const vnpUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const returnUrl = process.env.FRONTEND_URL + `/launches?onboarding=true&check=${uniqueId}`;

    const date = new Date();
    const vnp_CreateDate = dayjs(date).format('YYYYMMDDHHmmss');
    
    // Calculate amount based on price ID or fixed pricing if possible
    // For now assume price is passed correctly or we use a static map.
    // In actual implementation, we map body.billing to VND.
    const amount = body.period === 'MONTHLY' ? 299000 : 2990000;

    let vnp_Params: Record<string, string | number> = {};
    vnp_Params['vnp_Version'] = '2.1.0';
    vnp_Params['vnp_Command'] = 'pay';
    vnp_Params['vnp_TmnCode'] = tmnCode;
    vnp_Params['vnp_Locale'] = 'vn';
    vnp_Params['vnp_CurrCode'] = 'VND';
    vnp_Params['vnp_TxnRef'] = makeId(15);
    vnp_Params['vnp_OrderInfo'] = `Thanh toan LightCircle ${body.billing} ${body.period}`;
    vnp_Params['vnp_OrderType'] = 'billpayment';
    vnp_Params['vnp_Amount'] = amount * 100; // VNPAY format: multiply by 100
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr'] = '127.0.0.1'; // Ideally we get this from request
    vnp_Params['vnp_CreateDate'] = vnp_CreateDate;

    // Optional metadata that we need to pass back through maybe another param, 
    // or store in database mapping vnp_TxnRef -> metadata

    vnp_Params = this.sortObject(vnp_Params);

    const signData = new URLSearchParams(vnp_Params as Record<string, string>).toString();
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex'); 
    vnp_Params['vnp_SecureHash'] = signed;

    const paymentUrl = vnpUrl + '?' + new URLSearchParams(vnp_Params as Record<string, string>).toString();

    return { url: paymentUrl };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string, // Not used similarly as Stripe, VNPAY uses IPN query vars
    endpointSecret?: string
  ): Promise<PaymentEvent> {
    // VNPAY webhook (IPN) receives data via query string. 
    // For this interface, let's assume rawBody contains the parsed JSON from query string
    try {
      const vnp_Params = JSON.parse(rawBody.toString('utf-8'));
      const secureHash = vnp_Params['vnp_SecureHash'];

      delete vnp_Params['vnp_SecureHash'];
      delete vnp_Params['vnp_SecureHashType'];

      const secretKey = process.env.VNPAY_HASH_SECRET!;
      const sortedParams = this.sortObject(vnp_Params);
      const signData = new URLSearchParams(sortedParams as Record<string, string>).toString();
      const hmac = crypto.createHmac('sha512', secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      if (secureHash === signed) {
        if (vnp_Params['vnp_ResponseCode'] === '00' && vnp_Params['vnp_TransactionStatus'] === '00') {
           return {
             ok: true,
             type: 'created',
             customerId: vnp_Params['vnp_TxnRef'],
           };
        } else {
           return {
             ok: true,
             type: 'failed',
             customerId: vnp_Params['vnp_TxnRef'],
           };
        }
      } else {
        return { ok: false, type: 'failed', customerId: '' };
      }
    } catch (e) {
      return { ok: false, type: 'failed', customerId: '' };
    }
  }

  async cancelSubscription(customerId: string): Promise<{ cancel_at: Date }> {
    // VNPay does not naturally have recurring checkout subscriptions natively without Tokenization. 
    // Usually it cancels the internal database record.
    return { cancel_at: new Date() };
  }

  async createOrGetCustomer(name: string, email: string, paymentId?: string | null): Promise<string> {
    // Return existing txnRef or generate a new user payment ID
    return paymentId || makeId(15);
  }

  private sortObject(obj: Record<string, any>) {
    const sorted: Record<string, string> = {};
    const str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
    }
    return sorted;
  }
}
