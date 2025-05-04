// Import the polyfill for crypto.getRandomValues() before anything else
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';
import App from './App';

// Register the main component
registerRootComponent(App); 