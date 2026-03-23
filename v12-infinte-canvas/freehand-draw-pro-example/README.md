## Usage Instructions

This example shows how to add a freehand drawing overlay to React Flow. Users can draw lines directly on the pane, and each completed line is converted into a custom node. These nodes can be resized with help of the built-in `NodeResizer`.

- **Drawing:** When drawing mode is enabled, click and drag on the canvas to draw a line. Release to create a new node.
- **Interacting:** Toggle "Drawing Inactive" to move, connect, or resize nodes as usual.
- **Resizing:** Select a freehand node to resize it using the resizer control points.

## Getting Started

To use the example code, you need to install the dependencies first:

```sh
npm install
```

If you want to run the example locally, run the following command in your terminal:

```sh
npm run dev
```

This will start a development server and run the example in your browser.

## Core Concept

This example demonstrates how to let users draw freehand lines:

- The `Freehand` component overlays the canvas and captures pointer events to record the drawing.
- When a drawing is completed, it is converted into a custom node (`FreehandNode`) with the drawn path as its shape.
- The app uses the `perfect-freehand` library to smooth the drawn lines.
- All styles are defined in `xy-theme.css` and `index.css` for a consistent look and feel.

## File Breakdown

- `src/App.tsx` – Main app logic and React Flow setup.
- `src/Freehand.tsx` – Handles the drawing overlay and pointer events.
- `src/FreehandNode.tsx` – Renders the custom freehand node.
- `src/path.ts` – Utility for converting points to SVG paths.
- `src/xy-theme.css` – Custom theme styles.
- `src/index.css` – Base and overlay styles.

## Dependencies

- `@xyflow/react`
- `perfect-freehand`
