# Editable Edge Pro Example

This is a [vite](https://vitejs.dev/) app that shows how to implement freely routable, editable edges and freeform connection line drawing.

## Installation

To get started, you can download the source code from our [pro platform](https://pro.reactflow.dev/examples), unzip it and `cd` into the folder.

After that, install the dependencies like this:

```sh
npm install
```

Now you can run the development environment:

```sh
npm run dev
```

## Guide

- [Dependencies](#dependencies)
- [Breakdown](#breakdown)
- [Theory](#theory)
- [Related docs](#related-docs)
- [See also](#see-also)

This example implements an `EditableEdge` which can be freely edited and routed by adding and moving control points along the edge.

## Dependencies

- @xyfow/react
- zustand

## Breakdown

### Editable edges

To implement edges that can be routed through movable control points, we need to create a [Custom Edge](https://reactflow.dev/learn/customization/custom-edges) that is able to draw a line through a set of given points and a `ControlPoint` Component to display and move those points. Additionally, for implementing the freeform connection line, we need a [Custom Connection Line](https://reactflow.dev/examples/edges/custom-connectionline) as well.

> Drawing straight edges through points is fairly trivial, drawing smooth lines is rather complicated. To learn more about the underlying algorithms used for this, head over the [Theory](#theory) section.

### Control points

Inside the `EditableEdge` component, we determine the Bézier path used for displaying the SVG and the position of the inactive Catmull-Rom control points along the edge. Inactive points don't influence the shape of the spline and are just used for displaying controls where additional points can be added.
Active points can be freely moved around (either by dragging or the arrow keys), inactive points become active points by clicking on them.

Using unique ids for every point (opposed to just using the index as key) is useful on many levels:

- React can identify every control point from each other and can update them accordingly and thus...
- ...focus states can be retained even when new control points are added
- writing/syncing points to a database, especially updating specific ones, gets easier

The edge state consists of all the points making up the shape of the curve. Inactive control points do not contribute to this shape and are not part of the edge state. Thus, we have to calculate them on the fly and assign ids to them that stay the same between rerenders. See `useIdsForInactiveControlPoints`.

### Freeform connection line drawing

Try tapping the spacebar to create new points while connecting two nodes, or holding down spacebar to freely draw edges made up of many control points.
This is implemented by using a Custom Connection Line. It creates a key listener for listening to spacebar presses, and adds additional Control Points based on the distance to the last created point. You can change the distance by adjusting the `DISTANCE` constant making the resulting edge more fine-grained.
We use [Zustand](https://github.com/pmndrs/zustand) to create a global state the Connection Line can write these points to and that can be read when creating a new edge in the [`onConnect`](https://reactflow.dev/api-reference/react-flow#on-connect) handler.

## Theory

### Catmull-Rom splines

A Catmull-Rom spline is a smooth path passing through a variable set of points. If you want to dig deeper, it is a special case of [Cubic Hermite splines](https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Catmull%E2%80%93Rom_spline) and we are specifically using centripetal Catmull-Rom splines, because [they don't create any cusps or self-intersections](http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf).

![A Catmull-Rom spline defined by 4 points](https://upload.wikimedia.org/wikipedia/commons/4/42/Catmull-Rom_Spline.png)

Well, unfortunately the [only possibility to draw a smooth path in a browser](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#curve_commands) (apart from rasterizing the path yourself) is a Bézier Curve.

### Bézier curves

Originally developed by Pierre Bézier at Renault for modeling car bodywork, Bézier curves have retained their relevance more than 60 years since their discovery. They are defined by a start and end point, and a flexible number of control point pairs. Each of these pairs define a "turn" of the curve along its path. However they are not well suited for drawing paths through specific points because the control points are not sitting on the curve itself, which is what Catmull-Rom splines solve.

![A bézier curve defined by 4 points](https://upload.wikimedia.org/wikipedia/commons/d/d0/Bezier_curve.svg)

### Catmull-Rom to Bezier

There is [fairly straight forward way](https://link.springer.com/article/10.1007/s42979-021-00770-x#Equ15) to convert Catmull-Rom splines to Bézier curves. Just a little note: A Catmull-Rom spline is defined by 4 points. In case you just have 2 points `p1 and p2` (e.g. start & end point), you can just set `p0 = p1` and `p3 = p2`.

### Bezier to Catmull-Rom

Why do we need to do the conversion the other way round as well, you might ask. Well, have a look at the "Bezier-Catmull-Rom" (this is a made up word) spline in the example. It's a Catmull-Rom spline that starts off as a Bézier curve, to be compatible with the default edge type in React Flow. The way it works is by first determining the default edge between the two points, and using those values to calculate the Catmull-Rom control point positions - that get turned back into Beziér Curve control points to be displayed as a SVG path.

## Related docs:

- [Custom Edges](https://reactflow.dev/learn/customization/custom-edges)
- [Custom Connection Line Example](https://reactflow.dev/examples/edges/custom-connectionline)
- [ConnectionLineComponentProps](https://reactflow.dev/api-reference/types/connection-line-component-props)

## See also:

- [Centripetal Catmull–Rom splines on Wikipedia](https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline)
- [Conversion Between Cubic Bezier Curves and Catmull–Rom Splines](https://link.springer.com/article/10.1007/s42979-021-00770-x)
