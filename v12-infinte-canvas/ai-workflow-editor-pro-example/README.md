# AI Workflow Editor Template

The AI Workflow Editor is a Next.js-based application designed to help you quickly create, manage, and visualize AI image generation workflows. Built with [React Flow UI](https://reactflow.dev/ui), [Next.js](https://nextjs.org/), and [Vercel AI SDK](https://ai-sdk.dev) and styled using [Tailwind CSS](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/), this project provides a highly customizable foundation for building and extending workflow editors.

## Table of Contents

- [Getting Started](#getting-started)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [What's Inside](#whats-inside)
- [Usage](#usage)
- [Working with Custom Nodes](#working-with-custom-nodes)
- [Contact Us](#contact-us)

## Getting Started

To get started, follow these steps:

1. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

2. **Run the development server**:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

3. Open your browser and navigate to `http://localhost:3000`.

## Tech Stack

- **React Flow UI**: The project uses [React Flow UI](https://reactflow.dev/ui). The components are designed to help you quickly get up to speed on projects.

- **shadcn CLI**: The project uses the [shadcn CLI](https://ui.shadcn.com/docs/cli) to manage UI components. This tool builds on top of [Tailwind CSS](https://tailwindcss.com/) and [shadcn/ui](https://ui.shadcn.com/) components, making it easy to add and customize UI elements.

- **State Management with Zustand**: The application uses Zustand for state management, providing a simple and efficient way to manage the state of nodes, edges, and other workflow-related data.

- **Vercel AI SDK**: The project uses [Vercel AI SDK](https://ai-sdk.dev) to generate images. Users must input an OpenAI API key to use the AI image generation nodes, which is stored in a cookie in the browser. It is then sent to Next.js API routes to be used by the Vercel AI SDK, in order to generate images and text.

## Features

- **Automatic Layouting**: Utilizes the [ELKjs](https://github.com/kieler/elkjs) layout engine to automatically arrange nodes and edges.
- **Drag-and-Drop Sidebar**: Add and arrange nodes using a drag-and-drop mechanism.
- **Customizable Components**: Uses React Flow Components and the shadcn library to create highly-customizable nodes and edges.
- **Dark Mode**: Toggles between light and dark themes, managed through the Zustand store.
- **Runner Functionality**: Executes and monitors nodes sequentially with a workflow runner.
- **AI Image and Text Generation**: Uses the Vercel AI SDK to generate images and text.

## What's Inside?

Here’s a comprehensive overview of the src folder structure and its contents:

- **`app`**: This directory contains the main application layout and routing logic. It’s where the Next.js pages and layouts are defined.

- **`components`**: This is where all the components live.

  - `ui`: Shadcn components are stored under this folder.
  - React Flow UI components

- **`app/workflow`**: This directory contains everything that is related to the workflow view.

  - `components`: Workflow specific components like custom nodes and custom edges
  - `hooks`: Hooks for controlling the workflow runner or doing the layout are stored here
  - `layouts`: The sidebar layout can be found in this folder
  - `store`: This folder contains the Zustand store for managing application state
  - `utils`: Some helper for mapping icons and doing the layout

- **`app/workflow/nodes/index.tsx`**: In this file we define the node config. You can read more about this in the section below.

- **`app/workflow/mock-data.ts`**: defines the initial nodes and edges for the workflow. You can modify this file to preload your workflow with custom nodes and connections.

- **`app/workflow/openai-data.ts`**: defines the available OpenAI models and image sizes to be passed to the Vercel AI SDK, that will be available to the user.

- **`app/api`**: This directory contains the API routes for the application. One for generating images and one for generating text.

- **`app/actions`**: This directory contains the actions for the application. These are used to handle the OpenAI API key in the cookie storage.

## Adding new React Flow UI components

Find a component you like and run the command to add it to your project.

```bash
npx shadcn@latest add https://ui.reactflow.dev/component-name
```

- This command copies the component code inside your components folder.
- It automatically installs all necessary dependencies.
- It utilizes previously added and even modified components or asks you if you’d like to overwrite them.
- It uses your existing Tailwind configuration.
- The components are not black-boxes and can be modified and extended to fit your needs.

## Extended Nodes Config

The `nodesConfig` (app/workflow/config.ts) object serves as a single source of truth on what node types are available throughout the application. It serves as a precursor for the `nodeTypes` passed to React Flow but also holds information on the icons to be used and especially handle positions, as they are kept consistent in between instances of each custom node.

```typescript
const nodesConfig: Record<AppNodeType, NodeConfig> = {
  'transform-node': {
    id: 'transform-node',
    title: 'Transform Node',
    handles: [
      {
        type: 'source',
        position: Position.Bottom,
        x: NODE_SIZE.width * 0.5,
        y: NODE_SIZE.height,
      },
      {
        type: 'target',
        position: Position.Top,
        x: NODE_SIZE.width * 0.5,
        y: 0,
      },
    ],
    icon: 'Spline',
    component: CustomNode,
  },
  // ... other node configurations
};
```

### What this approach simplifies

1. **Adding nodes through the sidebar and context menu**: We have easy access to all available node types and we can add new nodes independantely from the sidebar and the context menu

2. **Providing abstraction for the custom nodes implementations**: We took a very extreme approach by having a single custom node component. In real-world applications this might not be applicable but it showcases a way to extract shared functionality across different node types.

3. **Layouting nodes**: Because we don't have to wait until the nodes are mounted, measured and handle positions determined, we can run layouting algorithms right after adding new nodes.

## State Management

By implementing our own [Zustand](https://github.com/pmndrs/zustand) application store, we were able to streamline state updates and accesses across the project. Additionally, we were able to prevent conflicts that might arise when mixing your own update functions with React Flows helper functions (like `setNodes` from `useReactFlow`). If you are interested in more information about the ins and outs of state management in React Flow [head over to our website](https://reactflow.dev/learn/advanced-use/state-management).

## Contact Us

We’re here to help! If you have any questions, feedback, or just want to share your projects with us, feel free to reach out:

- **Contact Form**: Use the contact form on our [website](https://xyflow.com/contact).
- **Email**: Drop us an email at [info@xyflow.com](mailto:info@xyflow.com).
- **Discord**: Join our [Discord server](https://discord.com/invite/RVmnytFmGW) to connect with the community and get support.
