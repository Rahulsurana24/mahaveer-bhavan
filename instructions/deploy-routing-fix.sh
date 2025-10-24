#!/bin/bash

# Netlify Routing Fix - Deployment Script
# This script pushes the routing fixes to GitHub

echo "======================================"
echo "Netlify Routing Fix Deployment"
echo "======================================"
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository"
    echo "Please run this script from your mahaveer-bhavan folder"
    exit 1
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Check if there are commits to push
COMMITS_AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null)
if [ -z "$COMMITS_AHEAD" ]; then
    echo "⚠️  Cannot determine commits ahead (remote tracking not set up)"
    COMMITS_AHEAD="unknown"
else
    echo "📦 Commits ahead of origin: $COMMITS_AHEAD"
fi

echo ""
echo "🚀 Attempting to push to GitHub..."
echo ""

# Try to push
if git push origin $CURRENT_BRANCH; then
    echo ""
    echo "======================================"
    echo "✅ SUCCESS!"
    echo "======================================"
    echo ""
    echo "Routing fixes have been pushed to GitHub."
    echo "Netlify will auto-deploy in ~2 minutes."
    echo ""
    echo "🧪 After deployment, test these:"
    echo "  - Refresh /events page"
    echo "  - Refresh /gallery page"
    echo "  - Visit / (should show Landing page)"
    echo ""
    echo "🔗 Monitor deployment at: https://app.netlify.com"
    echo ""
else
    echo ""
    echo "======================================"
    echo "❌ Push Failed"
    echo "======================================"
    echo ""
    echo "The push failed due to authentication issues."
    echo ""
    echo "📋 Try one of these solutions:"
    echo ""
    echo "1. Use GitHub Desktop:"
    echo "   - Open GitHub Desktop"
    echo "   - Click 'Push origin' button"
    echo ""
    echo "2. Use GitHub CLI:"
    echo "   gh auth login"
    echo "   git push origin main"
    echo ""
    echo "3. Update git credentials:"
    echo "   - Go to: https://github.com/settings/tokens"
    echo "   - Generate new token"
    echo "   - Update git remote with new token"
    echo ""
    exit 1
fi
