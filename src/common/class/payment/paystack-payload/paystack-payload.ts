export class PaystackPayload {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    paid_at: string;
    channel: string;
    currency: string;
    metadata: any;
    authorization: any;
    customer: any;
    [key: string]: any;
  };
}
