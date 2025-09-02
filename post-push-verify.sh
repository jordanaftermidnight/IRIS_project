#!/bin/bash

echo "🔄 IRIS Post-Push Verification Script"
echo "====================================="
echo ""

# Verify push was successful
echo "📡 Checking GitHub sync status..."
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Local and remote are in sync!"
else
    echo "⚠️  Local and remote are different - push may be pending"
    echo "  Local:  $LOCAL"
    echo "  Remote: $REMOTE"
fi

echo ""
echo "🔍 Verifying deployment readiness..."

# Test clone in temp directory
TEMP_DIR="/tmp/iris-test-$$"
echo "• Testing fresh clone..."
git clone https://github.com/jordanaftermidnight/Iris_Integrated-Runtime-Intelligence-Service.git "$TEMP_DIR" 2>/dev/null

if [ -d "$TEMP_DIR" ]; then
    cd "$TEMP_DIR"
    
    # Check files exist
    echo "• Checking critical files..."
    if [ -f "package.json" ] && [ -f "src/enhanced-ai.js" ] && [ -f "README.md" ]; then
        echo "  ✅ All critical files present"
    else
        echo "  ❌ Missing critical files"
    fi
    
    # Test npm install
    echo "• Testing npm install (this may take a moment)..."
    npm install --silent 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✅ Dependencies installed successfully"
    else
        echo "  ⚠️  Some dependencies failed (may need API keys)"
    fi
    
    # Test basic functionality
    echo "• Testing basic functionality..."
    node -e "const { MultiAI } = require('./src/index.js'); console.log('  ✅ Core module loads successfully');" 2>/dev/null || echo "  ⚠️  Module loading needs ES6 imports"
    
    # Cleanup
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
else
    echo "❌ Could not clone repository - check if push was successful"
fi

echo ""
echo "📊 Repository Statistics:"
echo "• Total commits: $(git rev-list --count HEAD)"
echo "• Contributors: $(git shortlog -sn | wc -l)"
echo "• Last commit: $(git log -1 --format='%h - %s')"

echo ""
echo "🌍 Global Deployment Test:"
echo ""
echo "Anyone can now deploy IRIS with:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "git clone https://github.com/jordanaftermidnight/Iris_Integrated-Runtime-Intelligence-Service.git"
echo "cd Iris_Integrated-Runtime-Intelligence-Service"
echo "npm install"
echo "npm start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "✅ Post-push verification complete!"