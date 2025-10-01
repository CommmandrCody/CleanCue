CleanCue v0.2.4 Release Notes
🆕 Overview

This release focuses on simplifying the CleanCue architecture while preserving all essential DJ functionality. By removing unnecessary complexity, the system is now leaner, easier to maintain, and more developer-friendly, without compromising on features.

🔄 Key Changes

Removed 1.1GB workers package
Eliminated the bulky workers dependency. Replaced with lightweight direct integrations to reduce footprint and improve performance.

Adopted JSON-based storage
Transitioned from a traditional database to a simple, JSON-based storage engine. This reduces overhead and simplifies both setup and maintenance.

Direct tool integration
Integrated core tools (yt-dlp, librosa, etc.) directly, removing redundant abstraction layers. This makes the system easier to debug and extend yet highly-configurabale.

Improved modular testing
Enhanced test coverage with a focus on modular validation of individual components. This ensures stability and simplifies future development.

Preserved full DJ feature set
Despite simplification, all core DJ features remain intact, including BPM detection, key analysis, energy scoring, **cue points**, and audio integration.

**Cue points are experimental in this release 

⚡ Developer Impact

Faster builds and reduced system complexity

Easier debugging with direct tool usage

Lighter install size and dependency tree

Improved CI/CD validation through modular tests

✅ Outcome

CleanCue v0.2.4 represents a return to simplicity. The platform is now more maintainable, transparent, and developer-friendly, while continuing to deliver the complete set of professional DJ library management features.