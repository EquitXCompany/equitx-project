import { CDP, CDPStatus } from "../entity/CDP";

export interface CDPDTO {
  id: string;
  lender: string;
  xlm_deposited: string;
  asset_lent: string;
  status: keyof typeof CDPStatus;
  asset: any; 
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

export function toCDPDTO(cdp: CDP): CDPDTO {
  return {
    ...cdp,
    status: CDPStatus[cdp.status] as keyof typeof CDPStatus
  };
}
