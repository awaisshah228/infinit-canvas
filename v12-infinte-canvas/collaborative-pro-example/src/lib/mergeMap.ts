type MergeEntry<Remote, Local> = {
  remote: Remote;
  local: Local;
};

type GetId<Remote> = (item: Remote) => string;
type DeriveLocal<Remote, Local> = (item: Remote) => Partial<Local>;
type IsRemoteEqual<Remote> = (a: Remote, b: Remote) => boolean;

/**
 * This auxiliary data structure caches a mapping between remote items and their
 * local projections, preserving local-only fields while syncing with new remote
 * data. This is used to merge the local state of flows (nodes and edges), which
 * contains properties that should not be synced to other clients, with the
 * remote state.
 *
 * The `MergeMap` class wraps a `Map` holding item IDs as keys, and a pair of
 * items `{remote: Remote, local: Local}` as values.
 *
 * The merging is done by the `merge` method, which happens when updates of
 * remote items are received. The `merge` method, takes the list of remote
 * items, and for each remote item, it will:
 * 1. Get the id of the remote item via the `getId` function.
 * 2. Check if the item is already cached in the map by its ID.
 * 3. If the item is already in the map, check if the cached remote item is equal
 *   to the newly received remote item via the `isRemoteEqual` function (shallow
 *   equality check by default). If it is, the local item is returned (cache hit).
 *   If it is not, the updated local item is derived from the remote item via the
 *   `deriveLocal` function, and then merged to the existing local item.
 * 4. If the item is not in the map, it will derive the local item from the
 *   remote item via the `deriveLocal` function and add it to the map.
 * 5. The map is pruned by removing items that are no longer present in the
 *   remote items.
 *
 * This way, the local state of the flow is preserved, and the remote state is
 * merged into it when updates are received.
 *
 */
export class MergeMap<Remote, Local> {
  private readonly entriesById: Map<string, MergeEntry<Remote, Local>>;
  private readonly getId: GetId<Remote>;
  private readonly deriveLocal: DeriveLocal<Remote, Local>;
  private readonly isRemoteEqual: IsRemoteEqual<Remote>;

  /**
   *
   * @param {Object} options - The options for the MergeMap.
   * @param {GetId<Remote>} options.getId - The function to get the id of the
   * remote item.
   * @param {DeriveLocal<Remote, Local>} options.deriveLocal - The function to
   * derive the local item from the remote item.
   * @param {IsRemoteEqual<Remote>} options.isRemoteEqual - The function to
   * check if two remote items are equal.
   */
  constructor(options: {
    getId: GetId<Remote>;
    deriveLocal: DeriveLocal<Remote, Local>;
    isRemoteEqual?: IsRemoteEqual<Remote>;
  }) {
    this.getId = options.getId;
    this.deriveLocal = options.deriveLocal;
    this.isRemoteEqual = options.isRemoteEqual ?? ((a, b) => a === b);
    this.entriesById = new Map<string, MergeEntry<Remote, Local>>();
  }

  /**
   * Merge the map with the latest remote items and return the derived locals in
   * the same order as the input list.
   */
  merge(remoteItems: readonly Remote[]) {
    // Track items we no longer see to prune them after processing.
    const unseenEntries = new Map(this.entriesById);

    const locals: Local[] = remoteItems.map((remote) => {
      const id = this.getId(remote);
      unseenEntries.delete(id);

      const cached = this.entriesById.get(id);
      if (cached && this.isRemoteEqual(cached.remote, remote)) {
        return cached.local;
      }

      const updatedLocal: Local = {
        ...cached?.local,
        ...this.deriveLocal(remote),
      } as Local;

      this.entriesById.set(id, { remote, local: updatedLocal });
      return updatedLocal;
    });

    // Remove entries that no longer exist remotely.
    unseenEntries.forEach((_, id) => {
      this.entriesById.delete(id);
    });

    return locals;
  }

  get(id: string) {
    return this.entriesById.get(id);
  }

  delete(id: string) {
    return this.entriesById.delete(id);
  }

  set(id: string, remote: Remote, local: Local) {
    const entry = { remote, local };
    this.entriesById.set(id, entry);
    return entry;
  }
}
