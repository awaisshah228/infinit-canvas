/*
 * libavoid-js - Port of libavoid viscluster
 * Original C++ library: Copyright (C) 2004-2008 Monash University
 * Original author: Michael Wybrow
 * JavaScript port for react-infinite-canvas
 *
 * Licensed under LGPL 2.1
 */

import { Polygon, ReferencingPolygon } from '../core/geomtypes';
import { IRouter } from './obstacle';


/**
 * The ClusterRef class represents a cluster object.
 *
 * Clusters are boundaries around groups of shape objects. Ideally, only
 * connectors with one endpoint inside the cluster and one endpoint outside
 * the cluster will cross the cluster boundary. Connectors that begin and
 * end inside a cluster will not route outside it, and connectors that begin
 * and end outside the cluster will not enter the cluster.
 */
export class ClusterRef {
  private _router: IRouter;
  private _polygon: ReferencingPolygon;
  private _rectangularPolygon: Polygon;
  private _active: boolean;
  private _clusterrefsPos: number;
  private _id: number;

  /**
   * Cluster reference constructor.
   *
   * Creates a cluster object reference, but does not yet place it
   * into the Router scene. You can add or remove the cluster to/from
   * the scene with Router.addCluster() and Router.delCluster(). The
   * cluster can effectively be moved with ClusterRef.setNewPoly().
   *
   * The poly argument should be used to specify a polygon boundary.
   * The rectangular boundary will be automatically generated from this.
   * The polygon boundary could be a convex hull consisting of points
   * from the boundaries of shapes.
   *
   * @param router  The router scene to place the cluster into.
   * @param poly   A Polygon representing the boundary of the cluster.
   * @param id  Optionally, a positive integer ID unique among all objects.
   */
  constructor(router: IRouter, poly: Polygon, id: number = 0) {
    console.assert(router !== null && router !== undefined,
        'ClusterRef: router must not be null');

    this._router = router;
    this._polygon = new ReferencingPolygon(poly, router);
    this._rectangularPolygon = this._polygon.boundingRectPolygon();
    this._active = false;
    this._clusterrefsPos = -1;

    this._id = this._router.assignId(id);

    this._router.addCluster(this);
  }

  /**
   * Cluster reference destructor.
   * Should not be called directly; use Router.deleteCluster() instead.
   */
  destroy(): void {
    if (this._router.m_currently_calling_destructors === false) {
      console.error(
        "ERROR: ClusterRef.destroy() shouldn't be called directly.\n" +
        "       It is owned by the router. Call Router.deleteCluster() instead."
      );
      throw new Error('ClusterRef.destroy() called directly');
    }
  }

  /**
   * Make this cluster active in the router scene.
   */
  makeActive(): void {
    console.assert(!this._active, 'ClusterRef.makeActive: already active');

    // Add to clusterRefs list (at the beginning).
    this._router.clusterRefs.unshift(this);
    this._clusterrefsPos = 0;

    this._active = true;
  }

  /**
   * Make this cluster inactive, removing it from the router scene.
   */
  makeInactive(): void {
    console.assert(this._active, 'ClusterRef.makeInactive: not active');

    // Remove from clusterRefs list.
    const idx: number = this._router.clusterRefs.indexOf(this);
    if (idx !== -1) {
      this._router.clusterRefs.splice(idx, 1);
    }

    this._active = false;
  }

  /**
   * Update the polygon boundary for this cluster.
   *
   * You should specify a polygon boundary. The rectangular one will
   * be generated automatically from this.
   *
   * @param poly  A Polygon representing the boundary of the cluster.
   */
  setNewPoly(poly: Polygon): void {
    this._polygon = new ReferencingPolygon(poly, this._router);
    this._rectangularPolygon = this._polygon.boundingRectPolygon();
  }

  /**
   * Returns the ID of this cluster.
   */
  id(): number {
    return this._id;
  }

  /**
   * Returns a reference to the polygon boundary of this cluster.
   */
  polygon(): ReferencingPolygon {
    return this._polygon;
  }

  /**
   * Returns a reference to the rectangular boundary of this cluster.
   */
  rectangularPolygon(): Polygon {
    return this._rectangularPolygon;
  }

  /**
   * Returns a pointer to the router scene this cluster is in.
   */
  router(): IRouter {
    return this._router;
  }
}
