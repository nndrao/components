# Documentation

This folder contains all project documentation.

## Contents

- [APP_V2_ARCHITECTURE.md](APP_V2_ARCHITECTURE.md) - Detailed explanation of the v2 architecture
- [CHECKPOINT.md](CHECKPOINT.md) - Project checkpoint and status
- [DESIGN_LANGUAGE_IMPLEMENTATION_GUIDE.md](DESIGN_LANGUAGE_IMPLEMENTATION_GUIDE.md) - UI/UX design implementation guide
- [ENTERPRISE_DIALOG_DESIGN_LANGUAGE.md](ENTERPRISE_DIALOG_DESIGN_LANGUAGE.md) - Enterprise dialog design patterns
- [demo.html](demo.html) - Demo HTML file

## Architecture Overview

The v2 architecture represents a complete rewrite focusing on simplicity and maintainability:

- Reduced from 3000+ lines to ~500 lines
- Simple Zustand store instead of complex service layers
- Direct component-to-store communication
- No circular dependencies
- Fast and predictable performance

For detailed information, see [APP_V2_ARCHITECTURE.md](APP_V2_ARCHITECTURE.md).