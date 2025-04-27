export class CampaignResponse {
  id: number;
  name: string;
  from: Date;
  to: Date;
  status: string;
  owner: { id: number; email: string };
  locations: { id: number; name: string }[];
  dailyBudget: number;
  totalBudget: number;
  banners: string[]
}
