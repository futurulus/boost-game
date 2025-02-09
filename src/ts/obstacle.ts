import { Vector, Polygon, Collider2d } from "collider2d";
import CollisionDetails from "collider2d/build/collision_details";
import { Rectangle } from "./types";

export class Obstacle {
  private collider: Collider2d;
  private obstacles: Obstacle[];
  private id: string;
  private object: Polygon;

  constructor(
    collider: Collider2d,
    obstacles: Obstacle[],
    id: string,
    object: Polygon
  ) {
    this.collider = collider;
    this.obstacles = obstacles;
    this.id = id;
    this.object = object;

    this.obstacles.push(this);
  }

  public getId(): string {
    return this.id;
  }

  public getObject(): Polygon {
    return this.object;
  }

  public editObstacle(payload: Polygon) {
    this.object = payload;
  }

  public removeObstacle() {
    this.obstacles = this.obstacles.filter(
      (obstacle) => obstacle.id !== this.id
    );
  }

  public collidesWith(obstacle: Obstacle): CollisionDetails {
    return this.collider.testPolygonPolygon(
      this.object,
      obstacle.object,
      true
    ) as CollisionDetails;
  }
}
