import { Request, Response } from "express";
import { CDPService } from "../services/cdpService";

export class CDPController {
  private cdpService: CDPService;

  private constructor(cdpService: CDPService) {
    this.cdpService = cdpService;
  }

  static async create(): Promise<CDPController> {
    const cdpService = await CDPService.create();
    return new CDPController(cdpService);
  }

  async getAllCDPs(req: Request, res: Response): Promise<void> {
    try {
      const cdps = await this.cdpService.findAll();
      res.json(cdps);
    } catch (error) {
      res.status(500).json({ message: "Error fetching CDPs" });
    }
  }

  async getAllCDPsByAssetSymbol(req: Request, res: Response): Promise<void> {
    try {
      const asset_symbol = req.params.asset_symbol;
      const cdps = await this.cdpService.findAllByAssetSymbol(asset_symbol);
      res.json(cdps);
    } catch (error) {
      res.status(500).json({ message: "Error fetching CDPs for asset symbol" });
    }
  }

  async getCDPByAssetSymbolAndAddr(req: Request, res: Response): Promise<void> {
    try {
      const cdp = await this.cdpService.findOne(req.params.asset_symbol, req.params.address);
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