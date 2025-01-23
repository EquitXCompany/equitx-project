import { Request, Response } from "express";
import { CDPService } from "../services/cdpService";

export class CDPController {
  private cdpService: CDPService;

  constructor() {
    this.cdpService = new CDPService();
  }

  async getAllCDPs(req: Request, res: Response): Promise<void> {
    try {
      const cdps = await this.cdpService.findAll();
      res.json(cdps);
    } catch (error) {
      res.status(500).json({ message: "Error fetching CDPs" });
    }
  }

  async getCDPByAssetSymbolAndAddr(req: Request, res: Response): Promise<void> {
    try {
      const cdp = await this.cdpService.findOne(req.params.asset_symbol, req.params.addr);
      if (cdp) {
        res.json(cdp);
      } else {
        res.status(404).json({ message: "CDP not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching CDP" });
    }
  }
}