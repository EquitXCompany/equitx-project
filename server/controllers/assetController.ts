import { Request, Response } from "express";
import { AssetService } from "../services/assetService";

export class AssetController {
  private assetService: AssetService;

  constructor() {
    this.assetService = new AssetService();
  }

  async getAllAssets(req: Request, res: Response): Promise<void> {
    try {
      const assets = await this.assetService.findAll();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ message: "Error fetching assets" });
    }
  }

  async getAssetBySymbol(req: Request, res: Response): Promise<void> {
    try {
      const asset = await this.assetService.findOne(req.params.symbol);
      if (asset) {
        res.json(asset);
      } else {
        res.status(404).json({ message: "Asset not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching asset" });
    }
  }
}