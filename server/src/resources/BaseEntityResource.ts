export abstract class BaseEntityResource {
  /**
   * Convert entity to full JSON response format
   */
  abstract toJson(entity: any): Object;

  /**
   * Convert entity to compressed format for bandwidth optimization
   */
  abstract toCompressed(entity: any): Object;

  /**
   * Convert array of entities to JSON format
   */
  toJsonArray(entities: any[]): Object[] {
    return entities.map(entity => this.toJson(entity));
  }

  /**
   * Convert array of entities to compressed format
   */
  toCompressedArray(entities: any[]): Object[] {
    return entities.map(entity => this.toCompressed(entity));
  }

  /**
   * Format response with metadata
   */
  formatResponse(data: any, compressed: boolean = false): Object {
    return compressed ? this.toCompressed(data) : this.toJson(data);
  }

  /**
   * Format array response with metadata
   */
  formatArrayResponse(data: any[], compressed: boolean = false): Object {
    return compressed ? this.toCompressedArray(data) : this.toJsonArray(data);
  }
}
