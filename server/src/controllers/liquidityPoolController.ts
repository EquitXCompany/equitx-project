import { Request, Response } from "express";
import { LiquidityPoolService } from "../services/liquidityPoolService";

export class LiquidityPoolController {
  private liquidityPoolService: LiquidityPoolService;

  private constructor(liquidityPoolService: LiquidityPoolService) {
    this.liquidityPoolService = liquidityPoolService;
  }

  static async create(): Promise<LiquidityPoolController> {
    const liquidityPoolService = await LiquidityPoolService.create();
    return new LiquidityPoolController(liquidityPoolService);
  }

  async getAllLiquidityPools(req: Request, res: Response): Promise<void> {
    try {
      const liquidityPools = await this.liquidityPoolService.findAll();
      res.json(liquidityPools);
    } catch (error) {
      res.status(500).json({ message: "Error fetching liquidity pools" });
    }
  }

  async getLiquidityPoolByAssetSymbol(req: Request, res: Response): Promise<void> {
    try {
      const liquidityPool = await this.liquidityPoolService.findOne(req.params.asset_symbol);
      if (liquidityPool) {
        res.json(liquidityPool);
      } else {
        res.status(404).json({ message: "Liquidity pool not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching liquidity pool" });
    }
  }
}