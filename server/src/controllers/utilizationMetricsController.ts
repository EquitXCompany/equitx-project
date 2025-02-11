import { Request, Response } from "express";
import { UtilizationMetricsService } from "../services/utilizationMetricsService";
import { UtilizationMetricsResource } from "../resources/UtilizationMetricsResource";
import { AssetService } from "../services/assetService";

export class UtilizationMetricsController {
  private utilizationService: UtilizationMetricsService;
  private assetService: AssetService;
  private resource: UtilizationMetricsResource;

  private constructor(utilizationService: UtilizationMetricsService, assetService: AssetService) {
    this.utilizationService = utilizationService;
    this.assetService = assetService;
    this.resource = new UtilizationMetricsResource();
  }

  static async create(): Promise<UtilizationMetricsController> {
    const utilizationService = await UtilizationMetricsService.create();
    const assetService = await AssetService.create();
    return new UtilizationMetricsController(utilizationService, assetService);
  }

  async getLatestUtilizationByAsset(req: Request, res: Response): Promise<void> {
    try {
      const asset = await this.assetService.findOne(req.params.asset_symbol);
      if (!asset) {
        res.status(404).json({ message: "Asset not found" });
        return;
      }

      const metrics = await this.utilizationService.findLatestByAsset(asset);
      if (!metrics) {
        res.status(404).json({ message: "Utilization metrics not found" });
        return;
      }

      res.json(this.resource.formatResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching utilization metrics" });
    }
  }

  async getUtilizationHistoryByAsset(req: Request, res: Response): Promise<void> {
    try {
      const asset = await this.assetService.findOne(req.params.asset_symbol);
      if (!asset) {
        res.status(404).json({ message: "Asset not found" });
        return;
      }

      const { start_date, end_date } = req.query;
      const metrics = await this.utilizationService.findInTimeRange(
        new Date(start_date as string),
        new Date(end_date as string)
      );

      res.json(this.resource.formatArrayResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching utilization history" });
    }
  }
}
