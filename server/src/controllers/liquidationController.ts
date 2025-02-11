import { Request, Response } from "express";
import { LiquidationService } from "../services/liquidationService";
import { LiquidationResource } from "../resources/LiquidationResource";

export class LiquidationController {
  private liquidationService: LiquidationService;
  private resource: LiquidationResource;

  private constructor(liquidationService: LiquidationService) {
    this.liquidationService = liquidationService;
    this.resource = new LiquidationResource();
  }

  static async create(): Promise<LiquidationController> {
    const liquidationService = await LiquidationService.create();
    return new LiquidationController(liquidationService);
  }

  async getAllLiquidations(req: Request, res: Response): Promise<void> {
    try {
      const liquidations = await this.liquidationService.findAll();
      res.json(this.resource.formatArrayResponse(liquidations));
    } catch (error) {
      res.status(500).json({ message: "Error fetching liquidations" });
    }
  }

  async getLiquidationsByAsset(req: Request, res: Response): Promise<void> {
    try {
      const liquidations = await this.liquidationService.findByAsset(req.params.asset_symbol);
      res.json(this.resource.formatArrayResponse(liquidations));
    } catch (error) {
      res.status(500).json({ message: "Error fetching liquidations by asset" });
    }
  }

  async getLiquidationsByCDP(req: Request, res: Response): Promise<void> {
    try {
      const liquidations = await this.liquidationService.findByCDP(req.params.cdp_id);
      res.json(this.resource.formatArrayResponse(liquidations));
    } catch (error) {
      res.status(500).json({ message: "Error fetching liquidations by CDP" });
    }
  }
}
