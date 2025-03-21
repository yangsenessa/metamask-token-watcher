# MetaMask Token Watcher Installation Guide

## React Dependency Conflicts

When installing this project's dependencies, you may encounter conflicts with the MetaMask SDK package. The newer versions of MetaMask SDK (0.15+) require React 19, while your project may be using React 18.x or earlier.

## Solution Options

### Option 1: Using the Built-in Isolation System (Recommended)

This project includes a custom React isolation system that allows the MetaMask SDK to load in a separate context, preventing React version conflicts. **No special installation steps are needed** for this approach:

```bash
npm install --omit=optional
```

The application will automatically:
1. Load the MetaMask SDK through our isolator
2. Fall back to our compatibility implementation if needed
3. Load the SDK from CDN as a last resort

### Option 2: Force Install with Dependency Overrides

If you need the full SDK functionality as a direct dependency:

```bash
# Using --force flag
npm install --force

# OR using legacy peer deps
npm install --legacy-peer-deps
```

**Note**: This approach will install the SDK with its React 19 dependency, but may cause compatibility issues.

### Option 3: Using a Compatible SDK Version

Install an older version of the SDK that's compatible with React 18:

```bash
# For projects using React 18
npm install @metamask/sdk@0.14.1 --save

# For projects using React 17
npm install @metamask/sdk@0.12.1 --save
```

### Option 4: Using Package Overrides (package.json)

Add an override in your `package.json` file:

```json
{
  "overrides": {
    "@metamask/sdk": {
      "react": "$react",
      "react-dom": "$react-dom"
    }
  }
}
```

Then install with:

```bash
npm install
```

This forces the SDK to use your project's React version.

## Troubleshooting

If you encounter errors after installation:

1. Clear your npm cache and node_modules:
   ```bash
   npm cache clean --force
   rm -rf node_modules
   npm install --legacy-peer-deps
   ```

2. If you're seeing React compatibility errors at runtime:
   - Check the browser console for specific error messages
   - Try using the SDK in non-React components
   - Use the built-in isolator methods

3. If you need to debug React version issues:
   ```javascript
   import { detectReactVersion } from './utils/react-version-resolver';
   console.log('Current React version:', detectReactVersion());
   ```

## Advanced: Manual SDK Configuration

If you need to fully customize how the SDK loads:

```javascript
import sdkIsolator from './utils/sdk-react-isolator';

// Load SDK in isolated environment
const sdk = await sdkIsolator.loadSDK();

// Get provider
const provider = sdk.getProvider();
```

## For React Native Projects

If you're using this in a React Native project, additional configuration may be needed. Please check the MetaMask SDK documentation for React Native compatibility details.
