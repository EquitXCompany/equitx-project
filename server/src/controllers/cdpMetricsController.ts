import { Request, Response } from "express";
import { CDPMetricsService } from "../services/cdpMetricsService";
import { CDPMetricsResource } from "../resources/CDPMetricsResource";
import { AssetService } from "../services/assetService";

export class CDPMetricsController {
  private cdpMetricsService: CDPMetricsService;
  private assetService: AssetService;
  private resource: CDPMetricsResource;

  private constructor(cdpMetricsService: CDPMetricsService, assetService: AssetService) {
    this.cdpMetricsService = cdpMetricsService;
    this.assetService = assetService;
    this.resource = new CDPMetricsResource();
  }

  static async create(): Promise<CDPMetricsController> {
    const cdpMetricsService = await CDPMetricsService.create();
    const assetService = await AssetService.create();
    return new CDPMetricsController(cdpMetricsService, assetService);
  }

  async getLatestMetricsByAsset(req: Request, res: Response): Promise<void> {
    try {
      const asset = await this.assetService.findOne(req.params.asset_symbol);
      if (!asset) {
        res.status(404).json({ message: "Asset not found" });
        return;
      }

      const metrics = await this.cdpMetricsService.findLatestByAsset(asset.symbol);
      if (!metrics) {
        res.status(404).json({ message: "CDP metrics not found" });
        return;
      }

      res.json(this.resource.formatResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching CDP metrics" });
    }
  }

  async getMetricsHistory(req: Request, res: Response): Promise<void> {
    try {
      const { start_time, end_time } = req.query;
      const metrics = await this.cdpMetricsService.findHistoricalByAsset(
        req.params.asset_symbol,
        new Date(start_time as string),
        new Date(end_time as string)
      );

      res.json(this.resource.formatArrayResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching CDP metrics history" });
    }
  }
}
