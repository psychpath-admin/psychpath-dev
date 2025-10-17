# Comprehensive Contextual Help System for PsychPATH

## Vision

Create a self-service help system that empowers users to understand and effectively use every feature of PsychPATH without external support, while maintaining compliance with AHPRA requirements.

## Help Page Structure

### Core Components (Your Requirements)

1. **Purpose** - Why this page exists
2. **Rules** - Compliance requirements and validation rules
3. **How to Use** - Step-by-step instructions
4. **Examples** - Real-world scenarios with screenshots/videos
5. **Metrics Descriptions** - What each number/chart means

### Additional Components to Include

#### 6. **Quick Start Guide**
- 3-5 step checklist to get started immediately
- "If you only do one thing on this page, do this..."
- Estimated time to complete typical tasks

#### 7. **Common Mistakes & How to Avoid Them**
- List of frequent errors users make
- Clear explanations of what went wrong
- How to fix or prevent each mistake

#### 8. **Validation Rules Explained**
- Why certain fields are required
- Date restrictions and their AHPRA basis
- Character limits and formatting requirements
- Interactive validation checker (optional)

#### 9. **Workflows & Decision Trees**
- "Should I use DCC or CRA?" flowchart
- "Which competencies apply?" decision guide
- Visual workflow diagrams

#### 10. **Video Tutorials**
- Screen recordings of complete workflows (2-5 minutes)
- Narrated walkthroughs
- Closed captions for accessibility
- Embedded YouTube/Vimeo or self-hosted

#### 11. **Interactive Demo/Sandbox**
- Practice mode with sample data
- Safe environment to experiment
- "Try it yourself" interactive elements
- Reset button to start over

#### 12. **FAQs (Page-Specific)**
- Most commonly asked questions for this page
- Searchable/filterable
- "Was this helpful?" feedback buttons

#### 13. **Glossary/Terminology**
- AHPRA-specific terms explained
- Psychology jargon clarified
- Hover tooltips on technical terms
- Link to master glossary

#### 14. **Related Pages & Features**
- "You might also need..."
- Links to prerequisite setup pages
- Connected workflows (e.g., "After logging hours, submit logbook")

#### 15. **AHPRA/Regulatory References**
- Direct links to relevant AHPRA guidelines
- Board requirements explained in plain language
- "Why we ask for this" compliance context

#### 16. **Troubleshooting Guide**
- "If X happens, try Y" scenarios
- Error message decoder
- "I can't find..." search tips
- Contact support escalation path

#### 17. **Keyboard Shortcuts & Tips**
- Power user features
- Time-saving tricks
- Accessibility shortcuts
- Browser-specific tips

#### 18. **Version History & Updates**
- "What's new" on this page
- Recent improvements
- Upcoming features
- Deprecation notices

#### 19. **Print-Friendly Resources**
- PDF quick reference cards
- Printable checklists
- One-page summaries
- Offline access materials

#### 20. **Success Metrics & Goals**
- "What does success look like?"
- Progress indicators
- Compliance thresholds explained
- Personal vs. cohort benchmarks

## Complete Example: Section A (DCC) Help Page

See full example in plan document including:
- Quick Start (30 seconds)
- Purpose statement
- AHPRA rules with context
- Step-by-step usage instructions
- 3 detailed examples with code blocks
- Metrics explanations
- Common mistakes guide
- Troubleshooting section
- Related pages
- AHPRA references
- Keyboard shortcuts
- Pro tips

## Implementation Architecture

### Technical Structure

```
/frontend/src/pages/help/
├── HelpLayout.tsx          # Shared layout with navigation
├── sections/
│   ├── SectionAHelp.tsx    # DCC help page
│   ├── SectionBHelp.tsx    # PD help page
│   ├── SectionCHelp.tsx    # Supervision help page
│   ├── ProfileHelp.tsx     # User profile help
│   └── LogbookHelp.tsx     # Logbook help
├── components/
│   ├── HelpSection.tsx     # Reusable section component
│   ├── HelpExample.tsx     # Example card component
│   ├── HelpMetric.tsx      # Metric explanation component
│   ├── HelpVideo.tsx       # Video embed component
│   ├── Troubleshooting.tsx # Q&A accordion component
│   └── RelatedPages.tsx    # Links component
└── data/
    ├── helpContent.ts      # Centralized help text
    ├── examples.ts         # Example scenarios
    ├── faqs.ts            # FAQ database
    └── glossary.ts        # Term definitions
```

### Help Page Features

#### 1. **Contextual Help Button**
Every page has a "?" help icon that:
- Opens relevant help page in new tab OR
- Shows inline help panel (slide-in from right) OR
- Opens modal with help content

#### 2. **Search Functionality**
- Full-text search across all help content
- "Search help..." in navigation
- Suggested articles as you type
- Recently viewed help pages

#### 3. **Progress Tracking**
- ☐ Checkboxes for "I've completed this"
- Help topics marked as "Read" automatically
- Personal help completion percentage
- Gamification: "Help Master" badges

#### 4. **Feedback Loop**
- "Was this helpful?" Yes/No on every section
- "What's missing?" text input
- Thumbs up/down on examples
- Auto-generates support tickets from feedback

#### 5. **Version for Each Role**
- Provisional Psychologist view
- Registrar Psychologist view
- Supervisor view
- Organization Admin view
- Content adapts based on user.role

#### 6. **Offline Access**
- Download complete help as PDF
- PWA support for offline viewing
- "Download for offline" button
- Mobile-optimized layouts

#### 7. **Multi-Language Support** (Future)
- English (primary)
- Mandarin, Arabic, etc. for diverse users
- Translation toggle in help header

## Content Management

### Content Strategy

**Create Content For:**
- Every page in the application
- Every major feature/workflow
- Every compliance requirement
- Every error message

**Content Principles:**
- Write for 8th-grade reading level
- Use active voice ("Click Save" not "Save should be clicked")
- Lead with action (imperative mood)
- Include visuals (1 image per 300 words)
- Test with real users before launch

### Content Maintenance

**Monthly Review:**
- Update screenshots if UI changes
- Add new FAQs from support tickets
- Refresh examples with real (anonymized) scenarios
- Check for broken links

**Quarterly Audit:**
- Verify AHPRA references still current
- Update metrics explanations if formulas change
- Review feedback data, improve low-rated content
- Add new video tutorials for complex features

**Version Control:**
- Track help content in Git
- Changelog for major help updates
- Notify users of significant help improvements

## Success Metrics

**Track:**
- Help page views vs. support tickets (goal: inverse correlation)
- Time spent on help pages
- "Was this helpful?" positive ratings (goal: >80%)
- Feature adoption rate before/after help launch
- User onboarding completion time
- Support ticket volume reduction (goal: -50%)

## Accessibility Requirements

- WCAG 2.1 AA compliant
- Screen reader optimized
- Keyboard navigation throughout
- Closed captions on all videos
- Alt text on all images
- High contrast mode support
- Text resizing up to 200%

## Quick Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- Create help page layout/navigation
- Write content for Section A (DCC)
- Implement contextual help buttons
- Basic search functionality

### Phase 2: Core Pages (Week 3-4)
- Section B (PD) help content
- Section C (Supervision) help content
- User Profile help content
- Video tutorials (record & embed)

### Phase 3: Enhancement (Week 5-6)
- Interactive examples
- Troubleshooting guides
- FAQs for all pages
- Feedback system

### Phase 4: Polish (Week 7-8)
- Metrics explanations
- Keyboard shortcuts documentation
- Print-friendly PDFs
- Mobile optimization
- User testing & refinement

## Additional Help System Elements

### In-App Contextual Help

**Inline Tooltips**
- Hover on field labels: "Why we ask this"
- Hover on metrics: Quick definition
- Hover on icons: Action description

**Progressive Disclosure**
- "Learn more" expanders
- "Advanced options" hidden by default
- "Show me how" links to help

**Empty States**
- First-time user guidance
- "Get started" CTAs
- Sample data to demonstrate

**Onboarding Tours**
- First login: Interactive walkthrough
- New feature announcements
- Skip/dismiss option
- "Take tour again" in help menu

**Validation Messages**
- Not just "Invalid" but "Why?" and "Fix how?"
- Link to help for complex validations
- Examples of valid input

## Content Examples by Page Type

### Dashboard Pages
- Purpose: Overview of X
- How to interpret charts
- What actions can I take from here?
- What should I do first?

### Form Pages
- What data is required vs optional?
- Why do we collect this?
- What happens after I submit?
- Can I save a draft?

### Report Pages
- What does this report show?
- How is each metric calculated?
- How can I export/share this?
- What date range should I use?

### Settings Pages
- What happens if I change this?
- Can I undo changes?
- Will this affect my existing data?
- Who else can see these settings?

## Future Enhancements

- AI chatbot for help Q&A
- Community forum integration
- Peer tips from experienced users
- Video library organized by topic
- Interactive decision trees
- Personalized help recommendations based on usage patterns
- Help content API for third-party integrations

## Notes

- **Created**: October 17, 2025
- **Status**: Future Plan - Not yet implemented
- **Priority**: High (Reduces support burden, improves UX)
- **Estimated Effort**: 8 weeks for Phase 1-4
- **Dependencies**: None - can start anytime
- **Benefits**:
  - Reduced support tickets (estimated -50%)
  - Faster user onboarding
  - Improved feature adoption
  - Better AHPRA compliance understanding
  - Professional appearance
  - Competitive advantage

## Related Plans

- **INACTIVITY_TIMEOUT_PLAN.md** - Session management with unsaved changes
- **Error Overlay System** - Already implemented, integrates with help
- **User Onboarding** - Can leverage help content for tours

## Next Steps When Ready to Implement

1. Review plan with stakeholders
2. Prioritize which pages get help first (Section A, B, C likely top priority)
3. Create content templates for consistency
4. Write initial content for Phase 1 pages
5. Design help UI/UX mockups
6. Develop technical infrastructure
7. Record video tutorials
8. Beta test with real users
9. Iterate based on feedback
10. Full rollout with announcement

