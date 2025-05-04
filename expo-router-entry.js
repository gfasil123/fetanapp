// Custom entry point for expo-router
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// Create a proper context function that expo-router expects
function createContextFunction() {
  // Define the routes we know exist in the app directory
  // Each key must include the full path, starting with ./
  const routes = [
    './index.tsx', 
    './_layout.tsx', 
    './login.tsx', 
    './register.tsx',
    './create-order.tsx',
    './+not-found.tsx',
    // Add routes for tabs if they exist
    './(tabs)/_layout.tsx',
    './(tabs)/index.tsx'
  ];
  
  // Create a proper module object that mimics what require.context would return
  const contextFunction = function(path) {
    // This should behave like requiring the module at the given path
    return require(`./app${path.slice(1)}`);
  };
  
  // Add the required properties and methods that expo-router expects
  contextFunction.keys = function() {
    return routes;
  };
  
  contextFunction.resolve = function(key) {
    // Make sure we return a proper path that can be resolved
    if (key.startsWith('./')) {
      return `./app${key.slice(1)}`;
    }
    return `./app/${key}`;
  };
  
  // The id property is used for caching and tracking the context
  contextFunction.id = 'app-directory';
  
  return contextFunction;
}

// Create the context
const context = createContextFunction();

// Create and export the root component
export function App() {
  return <ExpoRoot context={context} />;
}

// Register the root component
registerRootComponent(App); 