# Contributing to Multi-AI Integration CLI

Thank you for your interest in contributing to Multi-AI Integration CLI! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use the [GitHub issue tracker](https://github.com/jordanaftermidnight/multi-ai-mcp-integration/issues)
- Check existing issues before creating new ones
- Provide detailed information including steps to reproduce
- Include system information (OS, Node.js version, etc.)

### Suggesting Features
- Open an issue with the "enhancement" label
- Describe the feature and its use case
- Discuss implementation approach if possible

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following our coding standards
4. **Test thoroughly**
5. **Commit with clear messages**
6. **Push to your fork**
7. **Create a Pull Request**

## 🛠️ Development Setup

```bash
# Clone your fork
git clone https://github.com/yourusername/multi-ai-mcp-integration.git
cd multi-ai-integration

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📋 Coding Standards

### JavaScript Style
- Use ES6+ features
- Follow existing code style
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused

### Example:
```javascript
/**
 * Processes a message with the selected AI provider
 * @param {string} message - The user message
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Response object with metadata
 */
async function processMessage(message, options = {}) {
  // Implementation
}
```

### Commit Messages
Follow conventional commits format:
- `feat: add new provider support`
- `fix: resolve memory leak in context management`
- `docs: update README installation steps`
- `test: add unit tests for provider router`

## 🧪 Testing

### Running Tests
```bash
# All tests
npm test

# Specific test file
npm test tests/provider-router.test.js

# With coverage
npm run test:coverage
```

### Writing Tests
- Add tests for new features
- Maintain or improve test coverage
- Use descriptive test names
- Test both success and error cases

## 📁 Project Structure

```
multi-ai-integration/
├── src/
│   ├── enhanced-ai.js      # Main application
│   ├── providers/          # AI provider implementations
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── docs/                   # Documentation
├── examples/               # Usage examples
└── config/                 # Configuration files
```

## 🔧 Adding New Providers

To add a new AI provider:

1. **Create provider class** extending `AIProvider`
2. **Implement required methods**: `initialize()`, `chat()`, `healthCheck()`
3. **Add to provider router**
4. **Write tests**
5. **Update documentation**

Example provider structure:
```javascript
class NewProvider extends AIProvider {
  constructor(config = {}) {
    super('newprovider', config);
    // Initialize provider-specific settings
  }

  async initialize() {
    // Setup and validation logic
  }

  async chat(message, options = {}) {
    // Chat implementation
  }

  async healthCheck() {
    // Health check implementation
  }
}
```

## 📚 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Include examples for new features
- Update CHANGELOG.md

## 🐛 Debugging

### Common Issues
- **Ollama connection**: Check if Ollama is running on correct port
- **Model availability**: Verify models are installed with `ollama list`
- **Memory issues**: Monitor context length and clear when needed

### Debug Mode
```bash
DEBUG=multi-ai:* npm start
```

## 🚀 Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release PR
4. Tag release after merge
5. Publish to npm (maintainers only)

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙋‍♀️ Getting Help

- Check existing documentation
- Search through issues
- Ask questions in discussions
- Contact maintainers if needed

## 🌟 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for helping make Multi-AI Integration CLI better! 🎉