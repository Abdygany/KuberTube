// vitest alias target for the `server-only` import — that package throws
// on load in any non-react-server environment, but our pure-function
// tests don't care about its boundary check.
export {};
