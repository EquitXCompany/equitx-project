import { Request, Response } from "express";
import { AssetService } from "../services/assetService";
import { Asset } from "../entity/Asset";

type AssetResponse = Omit<Asset, 'last_queried_timestamp'>;

export class AssetController {
  private assetService: AssetService;

  private constructor(assetService: AssetService) {
    this.assetService = assetService;
  }

  static async create(): Promise<AssetController> {
    const assetService = await AssetService.create();
    return new AssetController(assetService);
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
