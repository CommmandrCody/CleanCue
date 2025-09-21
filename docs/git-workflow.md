# CleanCue Git Workflow & Collaboration Guide

## 🎯 Current Status (BASELINE ESTABLISHED)

✅ **Codebase Baselined** - 5 major commits covering:
- 📚 Comprehensive foundation backlog and optimization guides
- 📦 Bundle size optimization (388MB → 375MB)
- 🔧 TypeScript module resolution fixes
- ⚡ Enterprise-grade worker pool with parallel processing
- 🎨 Enhanced UI with STEM visualization

## 🔄 Git Workflow Strategy

### Branch Structure
```
main                    # Stable releases only
├── develop            # Integration branch for features
├── feature/phase0-*   # Phase 0: Beatgrid & cue detection
├── feature/phase1-*   # Phase 1: Music fingerprinting
├── feature/phase2-*   # Phase 2: YouTube enhancements
├── feature/ui-*       # UI/UX improvements
├── feature/docs-*     # Documentation updates
└── hotfix/*          # Critical production fixes
```

### Commit Convention
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new feature
fix: bug fix
docs: documentation only
style: formatting, missing semicolons, etc.
refactor: code change that neither fixes a bug nor adds a feature
perf: performance improvement
test: adding missing tests
chore: maintain (dependencies, config, etc.)
```

**Examples**:
```bash
feat(workers): implement multi-algorithm beat detection
fix(ui): resolve STEM queue progress indicator accuracy
docs(backlog): update Phase 0 with completed tasks
perf(engine): optimize parallel analysis for large libraries
```

## 🏗️ Development Process

### 1. Feature Development
```bash
# Start new feature from develop
git checkout develop
git pull origin develop
git checkout -b feature/phase0-beat-detection

# Work in small commits
git add -A
git commit -m "feat(analysis): add librosa beat detection algorithm"

# Push regularly for backup/visibility
git push -u origin feature/phase0-beat-detection
```

### 2. Ready for Review
```bash
# Update from develop before merge
git checkout develop
git pull origin develop
git checkout feature/phase0-beat-detection
git rebase develop

# Create pull request (GitHub/GitLab)
# Include:
# - Link to backlog item
# - Testing performed
# - Screenshots for UI changes
# - Breaking changes noted
```

### 3. Integration
```bash
# After review approval
git checkout develop
git merge --no-ff feature/phase0-beat-detection
git push origin develop
git branch -d feature/phase0-beat-detection
```

## 📋 Backlog Integration with Git

### GitHub Issues/Projects
Convert `docs/foundation-backlog.md` to:

**Phase 0: Advanced Cue Detection** 🎯
- [ ] Issue #1: Multi-algorithm beat detection
- [ ] Issue #2: Variable tempo handling
- [ ] Issue #3: Cue point confidence scoring
- [ ] Issue #4: Manual beatgrid adjustment tools

**Phase 1: Music Fingerprinting** 🎵
- [ ] Issue #5: AcoustID/MusicBrainz integration
- [ ] Issue #6: Filename intelligence parsing
- [ ] Issue #7: Batch identification system

### Issue Templates
```markdown
## Feature Request: [Title]

**Phase**: Phase X - [Phase Name]
**Priority**: High/Medium/Low
**Backlog Reference**: Link to foundation-backlog.md section

### Description
Clear description of the feature

### Acceptance Criteria
- [ ] Specific, testable requirements
- [ ] Performance benchmarks if applicable
- [ ] UI/UX specifications

### Technical Notes
- Dependencies
- APIs to implement
- Testing approach

### Related Issues
Links to dependent/blocking issues
```

## 🚀 Collaboration Preparation

### For Contributors
1. **Fork the repository**
2. **Read `docs/foundation-backlog.md`** - understand the roadmap
3. **Check open issues** - find tasks that match your skills
4. **Follow the workflow** - feature branches, conventional commits
5. **Test thoroughly** - run `pnpm run test:health` before PR

### For Maintainers
1. **Review PRs against backlog items**
2. **Require tests for new features**
3. **Ensure documentation updates**
4. **Validate performance impact**
5. **Test cross-platform compatibility**

## 📊 Progress Tracking

### GitHub Project Board
```
📋 Backlog (Phase N items)
🏗️ In Progress (actively worked on)
👀 Review (PR submitted)
✅ Done (merged to develop)
🚀 Released (in main branch)
```

### Milestones
- **Phase 0 Complete**: Advanced cue detection ready
- **Phase 1 Complete**: Music identification working
- **Foundation Stable**: Ready for beta testing
- **Export Ready**: First external format support

## 🔍 Quality Gates

### Before Each Commit
```bash
# Run local checks
pnpm run type-check
pnpm run lint
npm run test  # if tests exist
```

### Before Each PR
```bash
# Comprehensive testing
pnpm run test:health
pnpm run build
# Test key workflows manually
```

### Before Each Release
```bash
# Full validation
pnpm run ci
# Cross-platform testing
# Performance benchmarking
# Documentation review
```

## 🎵 Phase-Specific Branches

### Current Priority: Phase 0
```bash
feature/phase0-multi-algorithm-beat-detection
feature/phase0-cue-point-detection
feature/phase0-beatgrid-validation
feature/phase0-export-format-adaptation
```

### Future Phases
```bash
feature/phase1-acoustid-integration
feature/phase1-filename-intelligence
feature/phase2-youtube-playlist-metadata
feature/phase2-smart-file-creation
```

## 📈 Success Metrics

### Commit Quality
- Clear, descriptive commit messages
- Atomic commits (one logical change)
- No broken states in commit history

### Collaboration Health
- PR review time < 48 hours
- CI/CD passing on all PRs
- Documentation kept current
- Regular contributor activity

### Code Quality
- Test coverage maintained
- Performance benchmarks met
- Security best practices followed
- Cross-platform compatibility verified

---

## 🎯 Next Steps

1. **Push baseline commits** to origin
2. **Create GitHub issues** from backlog items
3. **Set up project board** with phase organization
4. **Begin Phase 0** development with beat detection
5. **Establish CI/CD pipeline** for automated testing

**Remember**: The goal is making collaboration smooth while maintaining the high quality standards CleanCue demands. Quality over speed, foundation before features.