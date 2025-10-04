#!/bin/bash

# PsychPATH Complete End-of-Day Script
# This script performs a complete EOD workflow:
# 1. Runs make eod to create checkpoint
# 2. Pushes all changes to GitHub
# 3. Updates CHECKPOINT_STATUS.md with session summary
# 4. Shuts down development servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
CHECKPOINT_FILE="$PROJECT_ROOT/CHECKPOINT_STATUS.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
DATE_ONLY=$(date '+%Y-%m-%d')
TIME_ONLY=$(date '+%H:%M')

echo -e "${BLUE}🚀 Starting Complete EOD Workflow...${NC}"
echo -e "${BLUE}📅 Date: $TIMESTAMP${NC}"
echo ""

# Step 1: Navigate to project directory
echo -e "${YELLOW}📁 Step 1: Navigating to project directory...${NC}"
cd "$PROJECT_ROOT"

# Step 2: Check if we're in a git repository
echo -e "${YELLOW}🔍 Step 2: Checking git status...${NC}"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}✅ Current branch: $CURRENT_BRANCH${NC}"

# Step 3: Check for uncommitted changes
echo -e "${YELLOW}📋 Step 3: Checking for uncommitted changes...${NC}"
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  Warning: There are uncommitted changes${NC}"
    git status --short
    echo ""
    read -p "Do you want to continue? Uncommitted changes will be included in the EOD checkpoint. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ EOD workflow cancelled${NC}"
        exit 1
    fi
fi

# Step 4: Run make eod
echo -e "${YELLOW}💾 Step 4: Creating EOD checkpoint...${NC}"
if make eod MSG="Complete EOD Workflow - $TIMESTAMP"; then
    echo -e "${GREEN}✅ EOD checkpoint created successfully${NC}"
else
    echo -e "${RED}❌ Error: Failed to create EOD checkpoint${NC}"
    exit 1
fi

# Step 5: Push to GitHub
echo -e "${YELLOW}📤 Step 5: Pushing to GitHub...${NC}"
echo "Pushing branch: $CURRENT_BRANCH"
if git push origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}✅ Branch pushed successfully${NC}"
else
    echo -e "${RED}❌ Error: Failed to push branch${NC}"
    exit 1
fi

echo "Pushing tags..."
if git push origin --tags; then
    echo -e "${GREEN}✅ Tags pushed successfully${NC}"
else
    echo -e "${RED}❌ Error: Failed to push tags${NC}"
    exit 1
fi

# Step 6: Update CHECKPOINT_STATUS.md
echo -e "${YELLOW}📝 Step 6: Updating CHECKPOINT_STATUS.md...${NC}"

# Create a backup of the current checkpoint file
cp "$CHECKPOINT_FILE" "$CHECKPOINT_FILE.backup.$DATE_ONLY"

# Create the new session summary
SESSION_SUMMARY="
## ✅ **COMPLETED THIS SESSION ($DATE_ONLY $TIME_ONLY)**

### **Complete EOD Workflow Execution** 🚀
- **Date**: $TIMESTAMP
- **Branch**: $CURRENT_BRANCH
- **Actions Completed**:
  - ✅ EOD checkpoint created with database backup
  - ✅ All changes committed to git
  - ✅ Branch pushed to GitHub: \`$CURRENT_BRANCH\`
  - ✅ All tags pushed to GitHub
  - ✅ CHECKPOINT_STATUS.md updated with session summary
  - ✅ Development servers shutdown
- **Git Commit**: Latest EOD checkpoint
- **Database Backup**: Created with timestamp
- **Status**: ✅ COMPLETE - Ready for next session

### **Development Environment Status** 🛠️
- **Django Server**: Shutdown (was running on port 8000)
- **Frontend Server**: Shutdown (was running on port 5174)
- **Database**: SQLite backup created
- **Git Status**: All changes committed and pushed
- **Next Session**: Use \`make dev-start\` to resume development

"

# Update the checkpoint file
if [ -f "$CHECKPOINT_FILE" ]; then
    # Create a temporary file with the session summary
    echo "$SESSION_SUMMARY" > "/tmp/session_summary.tmp"
    
    # Find the line with "## ✅ **COMPLETED THIS SESSION" and replace everything after it
    # until we find the next "## ✅ **PREVIOUSLY COMPLETED" section
    awk '
    BEGIN { in_current_session = 0; found_current = 0 }
    /^## ✅ \*\*COMPLETED THIS SESSION/ { 
        in_current_session = 1; 
        found_current = 1;
        print $0;
        next 
    }
    /^## ✅ \*\*PREVIOUSLY COMPLETED/ && in_current_session { 
        in_current_session = 0;
        print $0;
        next 
    }
    !in_current_session { print $0 }
    ' "$CHECKPOINT_FILE" > "$CHECKPOINT_FILE.tmp"
    
    # Insert the new session summary before the "PREVIOUSLY COMPLETED" section
    awk '
    /^## ✅ \*\*PREVIOUSLY COMPLETED/ {
        system("cat /tmp/session_summary.tmp")
        print $0;
        next
    }
    { print $0 }
    ' "$CHECKPOINT_FILE.tmp" > "$CHECKPOINT_FILE"
    
    # Clean up temporary files
    rm "$CHECKPOINT_FILE.tmp" "/tmp/session_summary.tmp"
    
    echo -e "${GREEN}✅ CHECKPOINT_STATUS.md updated successfully${NC}"
else
    echo -e "${RED}❌ Error: CHECKPOINT_STATUS.md not found${NC}"
    exit 1
fi

# Step 7: Shutdown development servers
echo -e "${YELLOW}🛑 Step 7: Shutting down development servers...${NC}"
if make dev-stop; then
    echo -e "${GREEN}✅ Development servers stopped successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Some servers may not have stopped properly${NC}"
fi

# Step 8: Final status check
echo -e "${YELLOW}🔍 Step 8: Final status check...${NC}"
echo "Checking server status..."
if make dev-status; then
    echo -e "${GREEN}✅ All servers are stopped${NC}"
else
    echo -e "${YELLOW}⚠️  Some servers may still be running${NC}"
fi

# Step 9: Summary
echo ""
echo -e "${GREEN}🎉 Complete EOD Workflow Finished Successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  • EOD checkpoint created with database backup"
echo -e "  • All changes committed to git"
echo -e "  • Branch \`$CURRENT_BRANCH\` pushed to GitHub"
echo -e "  • All tags pushed to GitHub"
echo -e "  • CHECKPOINT_STATUS.md updated"
echo -e "  • Development servers stopped"
echo ""
echo -e "${BLUE}🚀 Next Session Commands:${NC}"
echo -e "  • \`make dev-start\` - Start development servers"
echo -e "  • \`make dev-status\` - Check server status"
echo -e "  • \`make dev-logs\` - View server logs"
echo ""
echo -e "${BLUE}📁 Files Created/Updated:${NC}"
echo -e "  • Database backup: \`backend/backups/db-$DATE_ONLY-*.sqlite3\`"
echo -e "  • Checkpoint backup: \`CHECKPOINT_STATUS.md.backup.$DATE_ONLY\`"
echo -e "  • Updated: \`CHECKPOINT_STATUS.md\`"
echo ""
echo -e "${GREEN}✅ EOD workflow completed at $TIMESTAMP${NC}"
