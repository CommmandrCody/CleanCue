# CleanCue Dependency Stability Plan

## Current Status ✅

**Development Environment**: WORKING
- UI server: ✅ Running on localhost:3000
- Engine initialization: ✅ Successful
- STEM separation: ✅ Working with htdemucs
- Python workers: ✅ Functional
- TypeScript compilation: ✅ All packages building

**Production Build**: ✅ WORKING
- Bundle optimization: ✅ 13MB reduction (388MB → 375MB)
- Electron packaging: ✅ Successfully creating DMG files
- Python environment: ✅ Dependencies available

## Issues Fixed During Review

1. **CommonJS/ESM Module Resolution**
   - **Problem**: `@cleancue/shared` was compiled as ES modules but consumed as CommonJS
   - **Fix**: Changed `tsconfig.json` module to "CommonJS"
   - **File**: `packages/shared/tsconfig.json`

2. **Missing Declaration Files**
   - **Problem**: TypeScript declaration files not generated properly
   - **Fix**: Manually created `index.d.ts` and `types.d.ts`
   - **Files**: `packages/shared/dist/index.d.ts`, `packages/shared/dist/types.d.ts`

3. **Package.json Exports**
   - **Problem**: Missing "require" export in shared package
   - **Fix**: Added both "import" and "require" to exports
   - **File**: `packages/shared/package.json`

## Fragility Points & Mitigation

### 1. TypeScript Project References
**Risk**: Changing one package breaks composite builds
**Mitigation**:
- Keep `composite: true` in all tsconfig.json files
- Always rebuild dependencies before dependent packages
- Use `pnpm run build` at root level for proper order

### 2. Workspace Dependencies
**Risk**: Module resolution failures in monorepo
**Mitigation**:
- Always use `workspace:*` for internal dependencies
- Keep pnpm-workspace.yaml synchronized
- Test both development and packaged builds

### 3. Python Environment
**Risk**: Bundle optimization breaking Python dependencies
**Mitigation**:
- Test new workers after any venv changes
- Keep backup of working venv (`venv.backup`)
- Use dependency installer for dynamic loading

### 4. Electron Packaging
**Risk**: Missing dependencies in packaged app
**Mitigation**:
- Test packaged app startup after major changes
- Use asarUnpack for critical runtime dependencies
- Validate extraResources filters don't exclude needed files

## Rollback Plan

### Quick Rollback (if dev environment breaks):
```bash
# 1. Restore original shared package module type
cd packages/shared
git checkout HEAD -- tsconfig.json package.json

# 2. Rebuild shared package
npm run clean && npm run build

# 3. Rebuild engine
cd ../engine
npm run clean && npm run build
```

### Full Rollback (if bundle optimization breaks):
```bash
# 1. Restore original package.json
cd apps/desktop
git checkout HEAD -- package.json

# 2. Restore original Python venv if needed
cd ../../packages/workers
if [ -d "venv.backup" ]; then
    rm -rf venv
    mv venv.backup venv
fi
```

## Testing Protocol

Before any major dependency changes:

1. **Development Test**:
   ```bash
   pnpm run dev  # Should start without errors
   ```

2. **Build Test**:
   ```bash
   pnpm run build  # All packages should compile
   ```

3. **Package Test**:
   ```bash
   cd apps/desktop && npm run build
   # Test app startup briefly
   ```

4. **Health Check**:
   ```bash
   pnpm run test:health  # Note: May show false positives
   ```

## Best Practices Going Forward

1. **Make Incremental Changes**: One dependency change at a time
2. **Test After Each Change**: Don't batch multiple risky changes
3. **Keep Backups**: Always backup working states before optimization
4. **Document Changes**: Update this file when making dependency changes
5. **Use Development Build**: Test changes in dev before packaging

## Current Working State

- **Shared Package**: CommonJS output, proper exports
- **Engine Package**: Successfully imports shared types
- **Desktop App**: Builds and runs in both dev and production
- **Python Workers**: All dependencies available, STEM separation working
- **Bundle Size**: Optimized to 375MB with comprehensive filtering

## Emergency Contacts

If the dependency chain breaks completely:
1. Check git status for uncommitted changes
2. Use `git stash` to save work
3. Reset to last known working commit
4. Apply changes one at a time with testing

Remember: **Stability over optimization**. The current state works - be very cautious with further changes.