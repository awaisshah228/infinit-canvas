import fs from 'node:fs/promises';
import path from 'node:path';
import * as url from 'url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import puppeteer from 'puppeteer';
import { Background, InfiniteCanvas } from '@infinit-canvas/react';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export function Flow({ nodes, edges, width, height }) {
  return React.createElement(
    InfiniteCanvas,
    {
      nodes: nodes,
      edges: edges,
      fitView: true,
      width: width,
      height: height,
      proOptions: {
        hideAttribution: true,
      },
    },
    React.createElement(Background, null)
  );
}

const styles = await fs.readFile(
  // This path will be different depending on where react flow is installed on
  // your system. All our Pro Examples live in a monorepo with a workspace set up
  // to share dependencies, that's why the path walks up the tree quite a bit.
  process.env.NODE_MODULES
    ? `${process.env.NODE_MODULES}/node_modules/@infinit-canvas/react/styles.css`
    : '../../../node_modules/@infinit-canvas/react/styles.css'
);

const xyThemeStyles = await fs.readFile(
  path.resolve(__dirname, 'xy-theme.css'),
  'utf-8'
);

export async function toHtml(flow) {
  const content = toStaticMarkup(flow);

  return `
    <html style="overflow: hidden;">
      <head>
        <style>${styles}</style>
        <style>${xyThemeStyles}</style>
        <style>html, body { margin: 0; width: ${flow.width}px; height: ${flow.height}px;}</style>
      </head>
      <body>
        ${content}
      </body>
    </html>`;
}

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  ignoreHTTPSErrors: true,
  dumpio: false,
});

export async function toImage(flow, type) {
  const html = await toHtml(flow);
  const page = await browser.newPage();

  await page.setViewport({ width: flow.width, height: flow.height });
  await page.setContent(html);

  const image = await page.screenshot({ type });

  await page.close();

  return image;
}

export default Flow;

function toStaticMarkup({ width, height, edges, ...flow }) {
  const nodes = flow.nodes.map((node) => {
    const handles = [
      { type: 'target', position: 'top', x: node.width / 2, y: 0 },
      { type: 'source', position: 'bottom', x: node.width / 2, y: node.height },
    ];

    return { ...node, handles };
  });

  return renderToStaticMarkup(
    React.createElement(Flow, {
      nodes,
      edges,
      width,
      height,
    })
  );
}
