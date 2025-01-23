import { getRepository } from "typeorm";
import { Singleton } from "../entity/Singleton";

export class SingletonService {
  private singletonRepository = getRepository(Singleton);

  async findAll(): Promise<Singleton[]> {
    return this.singletonRepository.find();
  }

  async findOne(key: string): Promise<Singleton | undefined> {
    return this.singletonRepository.findOne({ where: { key } });
  }

  async insert(singleton: Singleton): Promise<Singleton> {
    return this.singletonRepository.save(singleton);
  }

  async update(key: string, singleton: Partial<Singleton>): Promise<Singleton | undefined> {
    await this.singletonRepository.update({ key }, singleton);
    return this.singletonRepository.findOne({ where: { key } });
  }

  async delete(key: string): Promise<void> {
    await this.singletonRepository.delete({ key });
  }
}