#!/usr/bin/env node

/**
 * Built-in Provider
 * Simple local AI responses with no external dependencies
 * Always available for basic tasks
 */

export class BuiltinProvider {
  constructor(options = {}) {
    this.name = 'builtin';
    this.available = true; // Always available
    this.priority = 9; // Lowest priority, fallback only
    this.costPerToken = 0; // Completely free
    
    // Simple knowledge base for common queries
    this.knowledgeBase = {
      greetings: [
        "Hello! I'm IRIS, your AI assistant. How can I help you today?",
        "Hi there! What can I help you with?",
        "Greetings! I'm ready to assist you."
      ],
      coding: {
        javascript: "JavaScript is a versatile programming language. Here's a basic example:\n\nconst hello = () => {\n  console.log('Hello, World!');\n};\n\nhello();",
        python: "Python is great for beginners. Here's a simple example:\n\ndef hello():\n    print('Hello, World!')\n\nhello()",
        help: "I can help with coding questions! Try asking about JavaScript, Python, HTML, CSS, or general programming concepts."
      },
      math: {
        basic: "I can help with basic math operations like addition, subtraction, multiplication, and division.",
        examples: "Example: 2 + 2 = 4, 10 - 3 = 7, 5 * 6 = 30, 20 / 4 = 5"
      },
      general: [
        "I'm a built-in AI assistant that can help with basic questions, coding examples, and simple math.",
        "While I'm not as sophisticated as the cloud models, I'm always available and completely free!",
        "For more advanced queries, IRIS will automatically use smarter models when available."
      ]
    };
  }

  async isAvailable() {
    return true; // Always available
  }

  async chat(message, options = {}) {
    const query = message.toLowerCase().trim();
    
    try {
      // Greeting detection
      if (this.isGreeting(query)) {
        const response = this.getRandomResponse(this.knowledgeBase.greetings);
        return {
          content: response,
          model: 'builtin-v1',
          provider: this.name
        };
      }

      // Basic math
      const mathResult = this.tryMath(query);
      if (mathResult) {
        return {
          content: `The answer is: ${mathResult}`,
          model: 'builtin-math',
          provider: this.name
        };
      }

      // Coding help
      if (this.isCodingQuery(query)) {
        return {
          content: this.getCodingHelp(query),
          model: 'builtin-code',
          provider: this.name
        };
      }

      // Default response
      return {
        content: `${this.getRandomResponse(this.knowledgeBase.general)}\n\nYour query: "${message}"\n\nFor more sophisticated responses, try setting up API keys for cloud providers, or IRIS will route to the best available model automatically.`,
        model: 'builtin-v1',
        provider: this.name
      };

    } catch (error) {
      return {
        content: "I encountered an error processing your request. This is the built-in fallback provider - for better responses, please ensure other AI providers are configured.",
        model: 'builtin-error',
        provider: this.name
      };
    }
  }

  isGreeting(query) {
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(g => query.includes(g));
  }

  tryMath(query) {
    // Simple math operations
    const mathRegex = /(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/;
    const match = query.match(mathRegex);
    
    if (match) {
      const [, num1, operator, num2] = match;
      const a = parseFloat(num1);
      const b = parseFloat(num2);
      
      switch (operator) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b !== 0 ? a / b : 'Cannot divide by zero';
        default: return null;
      }
    }
    return null;
  }

  isCodingQuery(query) {
    const codingKeywords = ['javascript', 'python', 'code', 'function', 'programming', 'html', 'css', 'js'];
    return codingKeywords.some(keyword => query.includes(keyword));
  }

  getCodingHelp(query) {
    if (query.includes('javascript') || query.includes('js')) {
      return this.knowledgeBase.coding.javascript;
    }
    if (query.includes('python')) {
      return this.knowledgeBase.coding.python;
    }
    return this.knowledgeBase.coding.help;
  }

  getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  async getAvailableModels() {
    return ['builtin-v1', 'builtin-math', 'builtin-code'];
  }

  getCapabilities() {
    return {
      chat: true,
      streaming: false,
      multimodal: false,
      reasoning: false,
      coding: true,
      math: true,
      creative: false,
      maxTokens: 500,
      languages: ['en'],
      specialties: ['basic-math', 'simple-coding', 'greetings']
    };
  }
}