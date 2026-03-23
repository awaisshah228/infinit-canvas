# Server Side Image Creation

This example is about how to create an image of a flow on the server. You can drag the nodes on the left and see the updated image on the right side of the example app.

## Installation

To get started, you can download the source code from our [pro platform](https://pro.reactflow.dev/examples),
unzip it and `cd` into the folder.

After that, install the dependencies like this:

```sh
npm install
```

Now you can run the development environment:

```sh
npm run dev
```

The development environment starts a [vite](https://vitejs.dev) dev server for
the frontend, and an Express server for the api. Vite has been configured to proxy
api requests to the Express server.

## Guide

- [Dependencies](#dependencies)
- [Breakdown](#breakdown)
- [Related docs](#related-docs)
- [See also](#see-also)

This example introduces a new feature for React Flow v12: [static server-side rendering](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration). You can now render flows as static HTML with or without hydration! This can be useful for SEO purposes and things like OpenGraph image generation or if you just want to render a static diagram without any interactivity.

## Dependencies

- Frontend
  - react-dom@18.2.0
  - react@18.2.0
  - @xyflow/react@12.0.3
  - zustand@4.5.4
- Backend
  - @xyflow/react@12.0.3
  - express@4.19.2,
  - puppeteer@22.6.1
  - react-dom@18.2.0
  - cors@2.8.5

## Breakdown

This example contains both the code for the frontend and a simple backend Express service. You can find the frontend code in the `src/` directory, and the backend code in the `api/` directory: we'll mostly be paying attention to the backend this time!

### Rendering static markup

For many folks, the most exciting part of this example is the ability to generate images. In order to generate images we need to render the flow as static HTML. Passing a `<InfiniteCanvas />` component to the `renderToStaticMarkup` function will now properly return a string of HTML. In order to make sure things get rendered correctly, there are a few things you need to keep in mind:

- You need to **explicitly** place handles on nodes. In a client-side React Flow
  app we measure the position of a node's handles and use that to calculate an
  edge's path (this is why you need [`useUpdateNodeInternals`](https://reactflow.dev/api-reference/hooks/use-update-node-internals)).
  When rendering statically, we don't have access to the DOM so we need to know
  the position of all your handles ahead of time!

  To do this you'll need to set the `handles` property on each of your nodes. In
  this example we center the handle and place target handles at the top and source
  handles at the bottom of each node.

  ```ts
  const nodes = flow.nodes.map((node) => {
    const handles = [
      { type: 'target', position: 'top', x: node.width / 2, y: 0 },
      { type: 'source', position: 'bottom', x: node.width / 2, y: node.height },
    ];

    return { ...node, handles };
  });
  ```

- You still need to include React Flow's stylesheet. Even though we render the
  Flow as static HTML, it still uses the same CSS classes for styling. If you're
  shipping a static flow to the client, you'll still need to include our stylesheet.
  We use [top-level await]() to read the contents of the stylesheet when the server
  first starts up:

  ```ts
  const styles = await fs.readFile(
    // This path will be different depending on where react flow is installed on
    // your system. All our Pro Examples live in a monorepo with a workspace set up
    // to share dependencies, that's why the path walks up the tree quite a bit.
    '../../../node_modules/@xyflow/react/dist/style.css'
  );
  ```

For this example we're embedding the generated HTML into an `<iframe>` but you
might want to save it to a file or combine it with some other markup to create a
full page.

### Generating images with puppeteer

We also show how you can render a flow as an image using puppeteer. Puppeteer is
a _headless_ browser that allows you to interact with web pages programmatically.
The feature we care about here, though, is the ability to take a "screenshot" of
the currently loaded page. All we need to is load static HTML we generated earlier
into puppeteer and then call `page.screenshot` to get a buffer of the image.

There are some performance considerations to keep in mind if you're going to deploy
an app that uses puppeteer to many uses. Puppeteer is a full browser, so it's quite
heavy. In our example we spin up a single browser instance for the duration of the
server's life, but in a production app you might want to consider using a pool of
browsers if you anticipate a lot of traffic!

Spinning up a new browser instance is quite slow, so where possible you want to
avoid doing that _in the request itself_: in our testing we found that it took
~1.5s to spin up a new browser instance!

### Docker & Deployment

We also added a Dockerfile with the correct configurations to get Puppeteer and Chromium running
inside a container. You can also check out the fly.toml which we use to deploy the server to
fly.io. Just make sure to change the configurations to fit your needs.
Be aware, you are running Chromium here, so memory should be taken into considerations. We have found
that the application runs better with at least 512mb.

## Related docs:

- [ssr-ssg-configuration](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration)

## See also:

- [node-html-to-image](https://github.com/frinyvonnick/node-html-to-image/tree/master)
- [puppeteer](https://pptr.dev)
- [satori](https://github.com/vercel/satori)
