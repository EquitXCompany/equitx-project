import { Request, Response } from "express";
import { UserMetricsService } from "../services/userMetricsService";
import { UserMetricsResource } from "../resources/UserMetricsResource";

export class UserMetricsController {
  private userMetricsService: UserMetricsService;
  private resource: UserMetricsResource;

  private constructor(userMetricsService: UserMetricsService) {
    this.userMetricsService = userMetricsService;
    this.resource = new UserMetricsResource();
  }

  static async create(): Promise<UserMetricsController> {
    const userMetricsService = await UserMetricsService.create();
    return new UserMetricsController(userMetricsService);
  }

  async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.userMetricsService.findByAddress(req.params.address);
      if (!metrics) {
        res.status(404).json({ message: "User metrics not found" });
        return;
      }
      res.json(this.resource.formatResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching user metrics" });
    }
  }

  async getUserMetricsHistory(req: Request, res: Response): Promise<void> {
    try {
      const { start_time, end_time } = req.query;
      const metrics = await this.userMetricsService.findHistoricalByAddress(
        req.params.address,
        new Date(start_time as string),
        new Date(end_time as string)
      );
      res.json(this.resource.formatArrayResponse(metrics));
    } catch (error) {
      res.status(500).json({ message: "Error fetching user metrics history" });
    }
  }
}
