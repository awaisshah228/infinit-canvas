# Collaborative flow

- [Dependencies](#dependencies)
- [Breakdown](#breakdown)
- [Related docs](#related-docs)
- [See also](#see-also)

This example shows how to add collaboration features to React Flow. We're using
[Yjs](https://docs.yjs.dev) to provide shared data types that can be manipulated
concurrently, but any CRDT library could be used instead.

Clients are connected over WebRTC using an example signaling server (so please
don't use this in production!). You can test this yourself by opening the page
in two tabs and seeing the changes sync between them. Nodes and edges can be
created, moved, and deleted in real time. Unfinished edges (connections) are
synced and displayed, as well as the mouse cursors of the other clients, each
with a different color.

## Setup

### Local Development

1. Create a new file called `.env` in the `app` folder (this file is gitignored).
2. Run `npm install` to install the dependencies.
3. Add the following line to the `.env` file:

```
VITE_WEBSOCKET_URL=wss://your-yjs-server-url.com
```

4. Run the project with `npm run dev`.

## Dependencies

- @xyflow/react
- y-websocket@2.0.6
- yjs@13.6.20

## Breakdown

The app is wrapped in a `<YjsSync>` provider component, which is responsible for
setting up the Yjs document and registering the observers for the nodes, edges,
cursors, and connections.

The main logic is implemented in a custom zustand store, which is responsible
for managing the state of the app. The store implements all the functions
expected by the `<InfiniteCanvas>` component to access and modify nodes and edges.

The store is split into multiple slices:

- `flow-slice.ts`: The main syncing logic for the nodes and edges.
- `cursor-slice.ts`: Manages the shared mouse cursor state.
- `connection-slice.ts`: Manages the shared connections (unfinished edges) state.
- `app-slice.ts`: Manages the app state.

The `flow-slice` is the most important slice, as it holds the in-memory state of
the nodes and edges, and implements a two-way sync with the Yjs document:

- It listens to changes made to the Yjs document and updates the in-memory state accordingly (See `merge` method below).
- It implements the callbacks that are expected by the `<InfiniteCanvas>` component, intercepting
  the changes made to the in-memory UI state and updating the Yjs document accordingly.

### The need of a Merge Map

As you can read in our [Multiplayer Guide](https://reactflow.dev/docs/guides/collaborative-editing),
you do not always want to sync all the properties of a node or edge. For
example, the `selected` and `measured` properties are client-side specific, and
you should not sync them. To solve this, we have implemented a custom `MergeMap`
class that allows you to merge the local state of the nodes and edges with the
remote state.

In short, if Alice and Bob are connected to the same flow, **Alice's set of
_selected_ nodes is not the same as Bob's set of _selected_ nodes**.

At the same time you also want to merge in any changes that come from the
server. As most solution don't provide any way to subscribe to patches only you
are left with 2 sets of nodes & edges: one for the local state and one that
comes from the server.

In your application store, we will thus need to keep track of:

- The **local** set of nodes & edges, which will be passed directly to React
  Flow to render. These are regular objects, and are not synced to the backend. We hold
  all state here, including **ephemeral** state for properties like `dragging`,
  `resizing`, `selected`, etc.
- The **synced** set of nodes & edges. This is usually provided by the
  multiplayer solution you are using, and thus often uses a different data
  structure, with a different API. Most importantly, we should only keep track of
  the **durable** state here, and not the ephemeral state like `dragging`,
  `resizing`, `selected`, etc.

The merge map is a wrapper around a `Map` holding item IDs as keys, and a
pair of items `{remote: Remote, local: Local}` as
values. Our nodes and edges are always uniquely identified by their `id` field.

We are caching both the remote (Yjs) and local items in the map, and we will
only update the local item if the remote item is different from the cached one.
We need a way to derive the local item from the remote item, and a way to check
if two remote items are equal (`IsRemoteEqual<Remote>`). In the Yjs case, a
simple object reference equality (shallow comparison) check is enough (`a === b`).

#### The `merge` method

The `merge` method is the core of the `MergeMap` class. It is used to merge the
local and remote state of the flow. **It is called by the `flow-slice` when
updates from the remote Yjs document state are received.** It takes the list of the new
remote items as input, and mutably modifies the map to produce an up-to-date
list of remote-local item pairs as output. For each remote item, `merge` will:

1. Get the ID of the remote item.
2. If the item is already cached in the map and is shallowly equal (as per `a === b`)
   to the newly received remote item, the local item is returned (cache hit).
3. If the item is already cached in the map and is **not** shallowly equal to the newly received
   remote item, the updated local item is derived from the new remote item by merging the cached local item with the new remote item.
4. If the item is not in the map (cache miss), it will derive the local item from the
   remote item by merging the cached local item with the new remote item, and add both as a pair in the map.
5. The map is pruned by removing items that are no longer present in the
   newly received remote items.

`MergeMap` makes it easy to _preserve local-only fields while syncing with new
remote data_. If we instead decided to derive the local array of nodes and edges
directly from remote nodes and edges, we would lose local-only properties like
`dragging`, `resizing` and `selected` discussed in the previous section. If we
instead iterated over the local arrays and merged the remote items on top of the
local state, we would end up in a costly and error-prone operation: we can not
detect easily if a node was deleted by remote, and we would have to iterate over
the entire local and remote arrays to find out received updates. A naive
`{...local, ...remote}` merge _would generate a new object reference for each
node and edge_, which would cause a re-render of the entire flow. _This would be
very inefficient!_.

## Related docs:

You can read more about some of the React Flow features we're using in this
example here:

- The [NodeChange](https://reactflow.dev/api-reference/types/node-change) type
- The [EdgeChange](https://reactflow.dev/api-reference/types/edge-change) type
- The [Auto Layout pro example](https://pro.reactflow.dev/examples/auto-layout)
  for guidance on implementing the sidebar

## See also:

- [Yjs docs](https://docs.yjs.dev)
- [y-websocket provider](https://github.com/yjs/y-websocket)
- [Serverless Yjs](https://medium.com/collaborne-engineering/serverless-yjs-72d0a84326a2)
