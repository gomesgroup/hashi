# Hashi - ChimeraX Web Integration

## Build/Run Commands
- Initialize project: `npm init` or `yarn init`
- Install dependencies: `npm install` or `yarn`
- Start development server: `npm run dev` or `yarn dev`
- Build for production: `npm run build` or `yarn build`
- Run tests: `npm test` or `yarn test`
- Run single test: `npm test -- -t "test name"` or `yarn test -t "test name"`

## Code Style Guidelines
- **Formatting**: Use Prettier with 2-space indentation
- **Naming**: 
  - Components: PascalCase (e.g., `MoleculeViewer`)
  - Functions/variables: camelCase (e.g., `loadMolecule`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_CONCURRENT_SESSIONS`)
- **Imports**: Group imports by external libraries, then internal modules
- **Types**: Use TypeScript for type safety when possible
- **Error Handling**: Use try/catch blocks for ChimeraX operations
- **Documentation**: JSDoc for functions, inline comments for complex logic
- **ChimeraX Integration**: Use REST API via localhost for all operations