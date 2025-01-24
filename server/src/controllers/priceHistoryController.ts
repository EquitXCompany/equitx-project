import { Request, Response } from "express";
import { PriceHistoryService } from "../services/priceHistoryService";

export class PriceHistoryController {
  private priceHistoryService: PriceHistoryService;

  private constructor(priceHistoryService: PriceHistoryService) {
    this.priceHistoryService = priceHistoryService;
  }

  static async create(): Promise<PriceHistoryController> {
    const priceHistoryService = await PriceHistoryService.create();
    return new PriceHistoryController(priceHistoryService);
  }

  async getPriceHistoryForAsset(req: Request, res: Response): Promise<void> {
    try {
      const { asset_symbol, start_timestamp, end_timestamp } = req.params;
      const priceHistory = await this.priceHistoryService.findPriceHistoryForAsset(
        asset_symbol,
        new Date(start_timestamp),
        new Date(end_timestamp)
      );
      res.json(priceHistory);
    } catch (error) {
      res.status(500).json({ message: "Error fetching price history" });
    }
  }

  async getLatestPriceForAsset(req: Request, res: Response): Promise<void> {
    try {
      const { asset_symbol } = req.params;
      const latestPrice = await this.priceHistoryService.findLatestPriceForAsset(asset_symbol);
      if (latestPrice) {
        res.json(latestPrice);
      } else {
        res.status(404).json({ message: "Latest price not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching latest price" });
    }
  }
}
