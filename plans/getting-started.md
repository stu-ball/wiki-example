# Getting Started with the Sample App

## 1. Prerequisites
- **Node.js**: Ensure you have Node.js v18 or higher installed (required by some dependencies in the lockfile).
- **npm**: Comes with Node.js. Alternatively, you can use `yarn` or `pnpm`.

## 2. Install Dependencies
```sh
npm install
```

## 3. Project Structure Overview
- Main entry: [`src/main.tsx`](src/main.tsx) mounts the React app to the DOM.
- HTML entry: [`index.html`](index.html) with `<div id="root"></div>` and script loading `src/main.tsx`.
- Vite config: [`vite.config.ts`](vite.config.ts) uses the React plugin.

## 4. Common Scripts
- **Development server:**
  ```sh
  npm run dev
  ```
  Starts Vite with hot module reload at [http://localhost:5173](http://localhost:5173) by default.

- **Build for production:**
  ```sh
  npm run build
  ```
  Runs TypeScript build and Vite production build. Output is in the `dist/` directory.

- **Preview production build:**
  ```sh
  npm run preview
  ```
  Serves the `dist/` directory locally to verify the production build.

## 5. Troubleshooting & Tips
- Ensure Node.js is v18+ (`node -v`).
- If you see dependency or engine errors, upgrade Node.js.
- If ports are in use, change the port in [`vite.config.ts`](vite.config.ts) or stop other processes.
- For TypeScript errors, check [`tsconfig.json`](tsconfig.json) and [`tsconfig.app.json`](tsconfig.app.json).
- For ESLint issues, run `npm run lint`.

## 6. Useful References
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

---

**To start developing:**
1. Install dependencies
2. Run the dev server
3. Edit files in `src/` and see changes live
