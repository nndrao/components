# Components Project

A modern React application with data grid components, built with TypeScript and Vite.

## Features

- 🚀 **Modern Stack**: React 18, TypeScript, Vite
- 📊 **Data Grid**: AG-Grid Enterprise with full-featured data tables
- 🎨 **UI Components**: Beautiful UI with shadcn/ui and Tailwind CSS
- 📱 **Workspace Management**: Dockview for flexible panel layouts
- 💾 **State Management**: Simple and efficient with Zustand
- 🔌 **Real-time Support**: WebSocket integration ready
- 🎯 **Type Safety**: Full TypeScript support with strict typing
- ✅ **Testing**: Vitest with React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building

```bash
npm run build
```

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
npm run lint
```

## Architecture

The project uses a clean, simplified architecture (v2) that prioritizes maintainability:

- **Single Store**: Zustand store manages all application state
- **Component-based**: Self-contained components with clear responsibilities
- **Direct State Access**: No complex service layers or abstractions
- **~500 lines total**: Compared to 3000+ in previous versions

See [documentation/APP_V2_ARCHITECTURE.md](documentation/APP_V2_ARCHITECTURE.md) for detailed architecture information.

## Project Structure

```
src/
├── app-v2/              # Main application code
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── hooks/          # Custom hooks
│   ├── store.ts        # Zustand store
│   └── types.ts        # TypeScript definitions
├── components/ui/       # shadcn/ui components
├── config/             # Configuration files
├── lib/                # Utilities
└── test/               # Test setup

documentation/          # Project documentation
```

## Key Components

### DataTable
- AG-Grid based data table with enterprise features
- Profile management for saving column states
- Collapsible toolbar
- Theme support (light/dark)

### Workspace
- Dockview-based panel management
- Save/load workspace layouts
- Drag and drop support
- Multiple component instances

### Profile Management
- Save and switch between different table configurations
- Persistent storage in localStorage
- Per-component profile isolation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
