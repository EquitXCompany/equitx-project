import { Request, Response } from "express";
import { ProtocolStatsService } from "../services/protocolStatsService";
import { ProtocolStatsResource } from "../resources/ProtocolStatsResource";

export class ProtocolStatsController {
  private protocolStatsService: ProtocolStatsService;
  private resource: ProtocolStatsResource;

  private constructor(protocolStatsService: ProtocolStatsService) {
    this.protocolStatsService = protocolStatsService;
    this.resource = new ProtocolStatsResource();
  }

  static async create(): Promise<ProtocolStatsController> {
    const protocolStatsService = await ProtocolStatsService.create();
    return new ProtocolStatsController(protocolStatsService);
  }

  async getLatestStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.protocolStatsService.findLatest();
      if (!stats) {
        res.status(404).json({ message: "Protocol stats not found" });
        return;
      }
      res.json(this.resource.formatResponse(stats));
    } catch (error) {
      res.status(500).json({ message: "Error fetching protocol stats" });
    }
  }

  async getStatsHistory(req: Request, res: Response): Promise<void> {
    try {
      const { start_time, end_time } = req.query;
      const stats = await this.protocolStatsService.findHistorical(
        new Date(start_time as string),
        new Date(end_time as string)
      );
      res.json(this.resource.formatArrayResponse(stats));
    } catch (error) {
      res.status(500).json({ message: "Error fetching protocol stats history" });
    }
  }
}