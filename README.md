# mu-webapp-2

A modern React application built with Webpack 5 and React 18.

## Features

- ⚛️ React 18 with modern features
- 🔧 Webpack 5 for fast bundling and hot reloading
- 🎨 Modern CSS with responsive design
- 📦 Babel for JavaScript transpilation
- 🚀 Development server with hot reload

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm start` - Start the development server
- `npm run build` - Build the app for production
- `npm run dev` - Start development server and open in browser

### Project Structure

```
mu-webapp-2/
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
├── webpack.config.js
├── .babelrc
└── README.md
```

## Development

The app uses Webpack 5 with hot module replacement for fast development. Any changes to the source files will automatically reload the browser.

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

MIT
