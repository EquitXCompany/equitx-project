import { Request, Response } from "express";
import { TVLService } from "../services/tvlService";
import { TVLMetricsResource } from "../resources/TVLMetricsResource";
import { AssetService } from "../services/assetService";

export class TVLMetricsController {
  private tvlService: TVLService;
  private assetService: AssetService;
  private resource: TVLMetricsResource;

  private constructor(tvlService: TVLService, assetService: AssetService) {
    this.tvlService = tvlService;
    this.assetService = assetService;
    this.resource = new TVLMetricsResource();
  }

  static async create(): Promise<TVLMetricsController> {
    const tvlService = await TVLService.create();
    const assetService = await AssetService.create();
    return new TVLMetricsController(tvlService, assetService);
  }

  async getLatestTVLByAsset(req: Request, res: Response): Promise<void> {
    try {
      const asset = await this.assetService.findOne(req.params.asset_symbol);
      if (!asset) {
        res.status(404).json({ message: "Asset not found" });
        return;
      }

      const metrics = await this.tvlService.findLatestByAsset(asset);
      if (!metrics) {
        res.status(404).json({ message: "TVL metrics not found" });
        return;
      }

      res.json(this.resource.formatResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching TVL metrics" });
    }
  }

  async getTVLHistoryByAsset(req: Request, res: Response): Promise<void> {
    try {
      const asset = await this.assetService.findOne(req.params.asset_symbol);
      if (!asset) {
        res.status(404).json({ message: "Asset not found" });
        return;
      }

      const { start_date, end_date } = req.query;
      const metrics = await this.tvlService.findInTimeRange(
        new Date(start_date as string),
        new Date(end_date as string)
      );

      res.json(this.resource.formatArrayResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching TVL history" });
    }
  }
}
