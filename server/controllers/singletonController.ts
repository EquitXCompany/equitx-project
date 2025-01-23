import { Request, Response } from "express";
import { SingletonService } from "../services/singletonService";

export class SingletonController {
  private singletonService: SingletonService;

  constructor() {
    this.singletonService = new SingletonService();
  }

  async getAllSingletons(req: Request, res: Response): Promise<void> {
    try {
      const singletons = await this.singletonService.findAll();
      res.json(singletons);
    } catch (error) {
      res.status(500).json({ message: "Error fetching singletons" });
    }
  }

  async getSingletonByKey(req: Request, res: Response): Promise<void> {
    try {
      const singleton = await this.singletonService.findOne(req.params.key);
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