import { Request, Response } from "express";
import { StakerService } from "../services/stakerService";

export class StakerController {
  private stakerService: StakerService;

  constructor() {
    this.stakerService = new StakerService();
  }

  async getAllStakers(req: Request, res: Response): Promise<void> {
    try {
      const stakers = await this.stakerService.findAll();
      res.json(stakers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching stakers" });
    }
  }

  async getStakerByAssetSymbolAndAddr(req: Request, res: Response): Promise<void> {
    try {
      const staker = await this.stakerService.findOne(req.params.asset_symbol, req.params.addr);
      if (staker) {
        res.json(staker);
      } else {
        res.status(404).json({ message: "Staker not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching staker" });
    }
  }
}