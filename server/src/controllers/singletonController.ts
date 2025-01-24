import { Request, Response } from "express";
import { SingletonService } from "../services/singletonService";

export class SingletonController {
  private singletonService: SingletonService;

  private constructor(singletonService: SingletonService) {
    this.singletonService = singletonService;
  }

  static async create(): Promise<SingletonController> {
    const singletonService = await SingletonService.create();
    return new SingletonController(singletonService);
  }

  async getAllSingletons(req: Request, res: Response): Promise<void> {
    try {
      const asset_symbol = req.params.asset_symbol;
      const singletons = await this.singletonService.findAll(asset_symbol);
      res.json(singletons);
    } catch (error) {
      res.status(500).json({ message: "Error fetching singletons" });
    }
  }

  async getSingletonByKey(req: Request, res: Response): Promise<void> {
    try {
      const { key, asset_symbol } = req.params;
      const singleton = await this.singletonService.findOne(key, asset_symbol);
      if (singleton) {
        res.json(singleton);
      } else {
        res.status(404).json({ message: "Singleton not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching singleton" });
    }
  }
}
