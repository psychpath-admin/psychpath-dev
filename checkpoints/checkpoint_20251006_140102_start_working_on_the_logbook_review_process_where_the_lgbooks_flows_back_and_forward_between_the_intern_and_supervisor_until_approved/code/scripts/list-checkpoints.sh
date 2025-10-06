#!/bin/bash

# List all available checkpoints

PROJECT_ROOT="/Users/macdemac/Local Sites/PsychPATH"
CHECKPOINT_DIR="$PROJECT_ROOT/checkpoints"

echo "🛡️  PsychPATH Checkpoint System"
echo "================================"
echo ""

if [ ! -d "$CHECKPOINT_DIR" ]; then
    echo "No checkpoints directory found. Create your first checkpoint with:"
    echo "  ./scripts/checkpoint.sh 'Description of your work'"
    exit 0
fi

echo "📋 Available Checkpoints:"
echo ""

# List checkpoints with details
for checkpoint in "$CHECKPOINT_DIR"/*; do
    if [ -d "$checkpoint" ]; then
        checkpoint_name=$(basename "$checkpoint")
        
        # Extract timestamp and description
        timestamp=$(echo "$checkpoint_name" | grep -o 'checkpoint_[0-9]*')
        timestamp=${timestamp#checkpoint_}
        description=$(echo "$checkpoint_name" | sed 's/checkpoint_[0-9]*_//' | tr '_' ' ')
        
        # Format timestamp
        if [ -n "$timestamp" ]; then
            formatted_time=$(date -j -f "%Y%m%d%H%M%S" "${timestamp}0000" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$timestamp")
        else
            formatted_time="Unknown"
        fi
        
        # Get checkpoint info
        if [ -f "$checkpoint/checkpoint-info.json" ]; then
            size=$(du -sh "$checkpoint" | cut -f1)
            echo "📦 $checkpoint_name"
            echo "   📅 Created: $formatted_time"
            echo "   📝 Description: $description"
            echo "   💾 Size: $size"
            echo "   🔄 Restore: $checkpoint/restore.sh"
            echo ""
        fi
    fi
done

echo "🔀 Git Checkpoints:"
echo ""

# List git checkpoint branches
cd "$PROJECT_ROOT"
git branch -a | grep "checkpoint/" | while read branch; do
    branch_name=$(echo "$branch" | sed 's/.*checkpoint\///')
    echo "   🌿 $branch_name"
done

echo ""
echo "📊 Usage:"
echo "   Create checkpoint: ./scripts/checkpoint.sh 'Description'"
echo "   List checkpoints:  ./scripts/list-checkpoints.sh"
echo "   Restore checkpoint: ./checkpoints/[checkpoint-name]/restore.sh"
