# 👨‍💻 IRIS AI Orchestration System - User Guide

**Version**: 2.0 Production Ready  
**Target Audience**: End Users, Content Creators, Developers  
**Difficulty Level**: Beginner to Intermediate

---

## 🎯 Welcome to IRIS!

IRIS (Integrated Runtime Intelligence Service) is your intelligent AI assistant that automatically selects the best AI provider for your specific needs. Whether you're writing code, creating content, or seeking quick answers, IRIS optimizes for quality, speed, and cost.

### 🌟 Why Choose IRIS?

- **💰 Cost-Optimized**: Automatically uses free local models when possible
- **⚡ Smart Routing**: Matches your task to the best AI provider
- **🛡️ Secure**: Built-in safety and privacy protection
- **🔄 Reliable**: Multiple fallback options ensure consistent availability
- **🎨 Versatile**: Handles code, creative writing, analysis, and more

---

## 🚀 Quick Start Guide

### Method 1: Command Line Interface (Recommended)

```bash
# Basic usage - ask anything!
iris chat "Hello, how can you help me?"

# Ask for code help
iris chat "Write a Python function to sort a list"

# Get creative assistance  
iris chat "Write a short story about robots"

# Quick answers
iris chat "What is the capital of France?"
```

### Method 2: Web Dashboard

```bash
# Launch the interactive dashboard
npm run demo

# Open browser to http://localhost:8082
# Type queries and see real-time AI responses!
```

---

## 💬 How to Chat with IRIS

### Basic Conversation

IRIS works like talking to an expert assistant who knows which specialist to consult:

```bash
iris chat "I need help with my website"
```

IRIS will automatically:
1. Analyze your request
2. Choose the best AI provider
3. Return a helpful response
4. Learn from the interaction

### Getting Better Results

#### ✅ **Good Examples:**
```bash
iris chat "Write a Python function that calculates compound interest with parameters for principal, rate, and time"

iris chat "Create a creative marketing email for a new eco-friendly product launch"

iris chat "Explain the differences between React and Vue.js for a beginner developer"
```

#### ❌ **Less Effective:**
```bash
iris chat "help"
iris chat "write code"
iris chat "make something"
```

### Conversation Tips

1. **Be Specific**: Include details about what you want
2. **Provide Context**: Mention your experience level or use case
3. **Ask Follow-ups**: IRIS remembers your conversation context
4. **Use Natural Language**: Write as you would speak to a colleague

---

## 🎭 Usage Scenarios & Examples

### 💻 Software Development

IRIS excels at programming tasks and will route to specialized coding models:

```bash
# Code Generation
iris chat "Create a React component for a user profile card with props for name, email, and avatar"

# Debugging Help
iris chat "Why is my JavaScript function returning undefined? Here's the code: function add(a, b) { return a + b } console.log(add(5))"

# Code Review
iris chat "Review this Python code for potential security issues: user_input = input(); exec(user_input)"

# Architecture Advice  
iris chat "What's the best way to structure a Node.js API with authentication, user management, and file uploads?"
```

### 🎨 Creative Content

For creative tasks, IRIS routes to AI providers optimized for imagination:

```bash
# Content Writing
iris chat "Write a professional LinkedIn post about the benefits of remote work for tech companies"

# Creative Writing
iris chat "Create a short science fiction story about AI assistants becoming friends with their users"

# Marketing Copy
iris chat "Write compelling product descriptions for a smart home security system"

# Brainstorming
iris chat "Generate 15 unique name ideas for a mobile app that helps people find local hiking trails"
```

### 🔍 Research & Analysis

For analytical tasks, IRIS uses providers specialized in reasoning:

```bash
# Market Research
iris chat "Analyze the current trends in electric vehicle adoption and their impact on traditional automotive industry"

# Technical Analysis
iris chat "Compare the pros and cons of microservices vs. monolithic architecture for a mid-sized e-commerce platform"

# Educational Content
iris chat "Explain blockchain technology in simple terms, including how it works, benefits, and real-world applications"

# Data Interpretation
iris chat "What factors should I consider when choosing between PostgreSQL and MongoDB for a social media application?"
```

### ⚡ Quick Help & Support

For fast answers, IRIS uses ultra-speed providers:

```bash
# Syntax Help
iris chat "What's the correct syntax for a Python try-catch block?"

# Quick Fixes  
iris chat "How do I fix the error 'Module not found' in Node.js?"

# Command Reference
iris chat "Git command to create a new branch and switch to it"

# Quick Definitions
iris chat "What does API stand for and what is its purpose?"
```

---

## 🎛️ Advanced Features

### Task Type Specification

While IRIS auto-detects task types, you can be explicit for better results:

```bash
# Force coding-optimized routing
iris chat "Create a database schema" --task=code

# Force creative-optimized routing  
iris chat "Write about database design" --task=creative

# Force fast response
iris chat "Quick explanation of databases" --task=fast

# Force analytical response
iris chat "Compare database types" --task=reasoning
```

### Provider Selection

Sometimes you want a specific AI provider:

```bash
# Use local Ollama (free, private)
iris chat "Analyze this code" --provider=ollama

# Use Groq (ultra-fast)
iris chat "Quick answer please" --provider=groq

# Use Gemini (creative tasks)
iris chat "Write a story" --provider=gemini

# Use OpenAI (complex reasoning)
iris chat "Solve this complex problem" --provider=openai
```

### System Information

Monitor IRIS performance and status:

```bash
# Check which AI providers are available
iris providers

# See system health
iris health

# View available models
iris models

# Comprehensive system status
iris status
```

---

## 🌐 Web Dashboard Guide

### Launching the Dashboard

```bash
# Option 1: Enhanced demo with real AI
npm run demo

# Option 2: Simple demo interface
npm run demo:simple

# Dashboard opens at http://localhost:8082
```

### Dashboard Features

#### 🎯 **Interactive Query Interface**
- Type questions in the large text area
- Choose provider manually or let IRIS auto-select
- See real-time responses with provider information
- View response times and quality indicators

#### 📊 **System Monitoring**
- **Health Metrics**: Overall system health percentage
- **Response Times**: Live chart of AI response speeds
- **Provider Status**: Real-time health of each AI provider
- **Usage Analytics**: See which providers are handling your queries

#### 🎮 **Demo Controls**
- **Run Health Check**: Test all system components
- **Simulate Failover**: See how IRIS handles provider failures
- **Test Security**: Demonstrate threat detection capabilities
- **Neural Learning**: Show how IRIS adapts and learns

#### 📈 **Real-time Charts**
- **Response Time Trends**: 30-point rolling window of performance
- **Provider Usage Distribution**: See which AIs handle different task types
- **Activity Log**: Live feed of system events and decisions

### Dashboard Tips

1. **Watch the Provider Selection**: Notice how IRIS chooses different AIs for different tasks
2. **Try Different Query Types**: Test coding, creative, and analytical queries
3. **Monitor Performance**: Use charts to understand system behavior
4. **Use Demo Controls**: Explore advanced features with demo buttons

---

## 🎨 Customization Options

### Themes

```bash
# The dashboard supports light and dark themes
# Click the theme toggle button (moon/sun icon) in the top-right
```

### Configuration

Create a custom config file:

```json
# ~/.iris/config.json
{
    "preferences": {
        "defaultProvider": "auto",
        "maxCost": 0.05,
        "responseStyle": "detailed",
        "timeout": 30000
    },
    "security": {
        "enableFiltering": true,
        "auditLogging": true
    }
}
```

---

## 🛡️ Privacy & Security

### Your Data Protection

1. **Local Processing**: When possible, IRIS uses local AI (Ollama) to keep your data private
2. **No Storage**: IRIS doesn't store your conversations permanently
3. **Secure Transmission**: All API communications are encrypted
4. **Audit Logging**: Security events are logged for your protection

### Best Practices

✅ **Safe to Share:**
- General programming questions
- Public information requests  
- Creative writing prompts
- Educational content

⚠️ **Be Cautious With:**
- Personal information (names, addresses, phone numbers)
- Proprietary code or business secrets
- Financial or medical information
- Passwords or API keys

❌ **Never Share:**
- Credit card numbers
- Social security numbers
- Private personal details
- Confidential business information

---

## 🔧 Troubleshooting

### Common Issues

#### "No providers available"
```bash
# Check provider status
iris providers

# Ensure Ollama is running (for local AI)
curl http://localhost:11434/api/version

# Try specific provider
iris chat "test" --provider=groq
```

#### "Slow responses"
```bash
# Use fast provider for quick answers
iris chat "your question" --provider=groq

# Check system health
iris health

# Try task-specific routing
iris chat "your question" --task=fast
```

#### "Error: Authentication failed"
```bash
# Check if API keys are set (for external providers)
echo $GROQ_API_KEY

# Use local provider instead
iris chat "your question" --provider=ollama
```

### Getting Help

1. **Built-in Help**: `iris --help`
2. **Provider Status**: `iris providers`
3. **System Diagnostics**: `iris health --verbose`
4. **Community Support**: GitHub discussions
5. **Documentation**: Check README files

---

## 📱 Integration Examples

### Using IRIS in Scripts

```bash
#!/bin/bash
# Generate daily commit messages
CHANGES=$(git diff --stat)
COMMIT_MSG=$(iris chat "Generate a git commit message for these changes: $CHANGES" --task=code)
echo "Suggested commit: $COMMIT_MSG"
```

### IDE Integration

```bash
# Quick documentation
iris chat "Document this function: $(pbpaste)" --task=code

# Code review
iris chat "Review this code for issues: $(cat myfile.js)" --task=code
```

### Content Creation Workflow

```bash
# Blog post creation
TOPIC="AI in healthcare"
OUTLINE=$(iris chat "Create an outline for a blog post about: $TOPIC" --task=creative)
echo "$OUTLINE"

# Generate sections
iris chat "Write the introduction section for: $TOPIC" --task=creative
```

---

## 🎓 Learning Path

### Beginner (Week 1)
- Start with basic `iris chat` commands
- Try different question types (code, creative, factual)
- Explore the web dashboard
- Learn about provider selection

### Intermediate (Week 2-3)
- Use task type specifications (`--task=code`)
- Try provider-specific queries (`--provider=ollama`)
- Monitor system performance with `iris status`
- Experiment with complex, multi-part questions

### Advanced (Week 4+)
- Create custom configuration files
- Integrate IRIS into your workflow scripts
- Use the API for programmatic access
- Contribute to the IRIS community

---

## 📊 Usage Analytics

### Understanding Your Usage

```bash
# See comprehensive system status
iris status --detailed

# View provider performance
iris providers --performance

# Check recent activity
iris history --recent
```

### Optimizing Your Experience

1. **Monitor Costs**: Keep track of usage with expensive providers
2. **Learn Patterns**: Notice which providers work best for your tasks
3. **Adjust Preferences**: Configure IRIS to match your workflow
4. **Provide Feedback**: Help improve IRIS routing decisions

---

## 🎉 Pro Tips

### Maximize IRIS Effectiveness

1. **Be Conversational**: IRIS understands natural language
2. **Provide Examples**: Show IRIS what you want when possible
3. **Iterate**: Ask follow-up questions to refine results
4. **Experiment**: Try different providers for the same task
5. **Context Matters**: Reference previous parts of your conversation

### Time-Saving Shortcuts

```bash
# Create aliases for common tasks
alias code-help='iris chat --task=code'
alias quick-answer='iris chat --task=fast'
alias creative-help='iris chat --task=creative'

# Use them like:
code-help "How do I handle errors in Python?"
quick-answer "What does HTTP 404 mean?"
creative-help "Write a product description for smart glasses"
```

---

## 🔮 What's Next?

### Upcoming Features
- **Voice Integration**: Talk to IRIS directly
- **File Processing**: Analyze documents and images
- **Team Collaboration**: Share IRIS with your team
- **Custom Models**: Add your own AI providers

### Community
- **GitHub**: Contribute code and report issues
- **Discussions**: Share tips and get help
- **Newsletter**: Stay updated on new features
- **Feedback**: Help shape IRIS development

---

## 📞 Support & Resources

### Quick Help
- **Command Help**: `iris --help`
- **Version Info**: `iris --version`
- **System Check**: `iris health`

### Documentation
- **Knowledge Base**: Complete technical documentation
- **Developer Guide**: For advanced integration
- **API Reference**: Programmatic access guide

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community Q&A and tips
- **Email Support**: jordanaftermidnight@users.noreply.github.com

---

**Happy AI-ing with IRIS! 🌈**

*Remember: IRIS learns from each interaction, so the more you use it, the better it gets at understanding your needs and preferences.*

---

**User Guide Version**: 2.0  
**Last Updated**: September 1, 2025  
**Next Update**: December 1, 2025

*This guide is updated regularly with new features and community feedback.*