import { Request, Response } from "express";
import { PricefeedService } from "../services/pricefeedService";

export class PricefeedController {
  private pricefeedService: PricefeedService;

  constructor() {
    this.pricefeedService = new PricefeedService();
  }

  async getAllPricefeeds(req: Request, res: Response): Promise<void> {
    try {
      const pricefeeds = await this.pricefeedService.findAll();
      res.json(pricefeeds);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pricefeeds" });
    }
  }

  async getPricefeedByAssetSymbol(req: Request, res: Response): Promise<void> {
    try {
      const pricefeed = await this.pricefeedService.findOne(req.params.asset_symbol);
      if (pricefeed) {
        res.json(pricefeed);
      } else {
        res.status(404).json({ message: "Pricefeed not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching pricefeed" });
    }
  }
}