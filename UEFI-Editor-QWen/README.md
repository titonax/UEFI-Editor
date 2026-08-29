# UEFI Editor QWen

A modern, modular UEFI/BIOS Setup Editor built with React and TypeScript. This application allows users to view and modify UEFI firmware setup configurations following clean code principles and best practices.

## Features

- **Modular Architecture**: Code organized into focused modules (checksum, expression-parser, condition-analyzer, file-manipulation, varstore-utils)
- **Strict Type Safety**: Comprehensive TypeScript configuration with strict mode enabled
- **Clean Code**: Functions limited to 80 lines, max 4 parameters, complexity under 15
- **Security Focused**: Safe file handling, input validation, no eval usage
- **Test Coverage**: Unit tests with Vitest, targeting 70%+ coverage
- **Modern UI**: Built with Mantine v7 component library
- **Notifications System**: Replaces alerts with proper notification toasts
- **Accessibility**: WCAG 2.1 compliant components

## Project Structure

```
UEFI-Editor-QWen/
├── src/
│   ├── core/                    # Core business logic modules
│   │   ├── types/               # TypeScript type definitions
│   │   ├── checksum/            # Hash calculation utilities
│   │   ├── expression-parser/   # IFR expression parsing
│   │   ├── condition-analyzer/  # Visibility condition analysis
│   │   ├── file-manipulation/   # Safe binary file operations
│   │   ├── varstore-utils/      # Variable store helpers
│   │   └── validation/          # Data validation utilities
│   ├── components/              # React components
│   │   ├── FileUploads/         # File upload handlers
│   │   ├── BiosImageUpload/     # BIOS image specific uploads
│   │   ├── Navigation/          # Menu tree navigation
│   │   ├── FormUi/              # Form editing interface
│   │   │   ├── SearchUi/        # Search functionality
│   │   │   ├── ConditionDetails/# Condition display
│   │   │   ├── FormField/       # Individual form fields
│   │   │   └── FormTable/       # Form table layout
│   │   ├── Header/              # Application header
│   │   ├── Footer/              # Application footer
│   │   ├── Notifications/       # Notification components
│   │   └── Layout/              # Layout wrappers
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # General utilities
│   ├── test/                    # Test setup and helpers
│   └── main.tsx                 # Application entry point
├── public/                      # Static assets
├── docs/                        # Documentation
└── .github/workflows/           # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Linting and Formatting

```bash
npm run lint          # Check code style
npm run lint:fix      # Fix auto-fixable issues
npm run typecheck     # Type checking only
```

## Code Quality Standards

This project follows the "White Book of Programming" principles:

### Type Safety
- No `any` types allowed
- No non-null assertions (`!`)
- Strict boolean expressions
- Exact optional property types

### Function Design
- Maximum 80 lines per function
- Maximum 4 parameters (use context objects otherwise)
- Maximum cyclomatic complexity of 15
- Maximum nesting depth of 4

### Naming Conventions
- PascalCase for interfaces, types, classes
- camelCase for variables, functions
- Descriptive names, no abbreviations
- Boolean variables prefixed with `is`, `has`, `should`

### Documentation
- JSDoc comments on all public APIs
- Module-level documentation
- Parameter and return type descriptions

### Security
- No `eval()` or `Function()` constructors
- Input validation on all user inputs
- Safe file size limits
- No direct filesystem access

## Testing Strategy

- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Test component interactions
- **Coverage Target**: 70% minimum across branches, functions, lines

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Original UEFI Editor project
- AMI Aptio V and IV specifications
- Mantine UI library team
- React and TypeScript communities
