By default, React Flow renders an attribution label in the bottom-right corner of the viewport. You can pass the `proOptions` prop to hide this attribution.

### React Flow v11 & v12

```tsx
const proOptions = {
  hideAttribution: true,
};

return <InfiniteCanvas proOptions={proOptions} {...rest} />;
```

### React Flow v10

```tsx
const proOptions = {
  // for versions < 10.2 you can use account: 'paid-enterprise'
  account: 'paid-pro',
  hideAttribution: true,
};

return <InfiniteCanvas proOptions={proOptions} {...rest} />;
```
