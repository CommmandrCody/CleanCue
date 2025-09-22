# CleanCue Database Documentation

Welcome to the CleanCue database documentation. This guide provides comprehensive information about the SQLite database schema, data dictionary, and common query patterns for users who want to directly interact with the CleanCue database.

## Overview

CleanCue uses SQLite as its database engine with the sql.js library for cross-platform compatibility. The database stores music library metadata, audio analysis results, DJ cue points, and stem separation data.

**Database Location**: Configurable in settings, typically stored locally in the user's data directory.

## Quick Reference

- **[Database Schema](./schema.md)** - Complete table definitions and relationships
- **[Data Dictionary](./data-dictionary.md)** - Field descriptions and meanings
- **[Query Examples](./query-examples.md)** - Common SQL queries for library management
- **[DJ Set Detection](./dj-set-detection.md)** - New fields for flagging unwieldy YouTube tracks

## Database Structure

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **tracks** | Main music library with metadata | UUID primary key, file paths, audio metadata, analysis results |
| **analyses** | Detailed analysis results | JSON storage, version tracking, status monitoring |
| **cue_points** | DJ cue points and markers | Position-based markers, confidence scoring |
| **stem_separations** | AI stem separation jobs | Progress tracking, file paths, model versioning |

### Key Features

- **File-based duplicate detection** using SHA-256 hashes
- **JSON storage** for flexible analysis parameters and results
- **Performance optimized** with strategic indexes
- **Extensible design** for future audio analysis features

## Recent Updates

### DJ Set Detection (v0.2.3+)
New fields added to the `tracks` table for detecting and flagging large DJ sets and mixes from YouTube:

- `isDjSet`: Boolean flag for detected DJ content
- `djSetType`: Classification (mix/set/podcast/radio_show/live_set)
- `djSetConfidence`: Detection confidence score (0-1)
- `djSetReason`: Explanation of detection reasoning

See [DJ Set Detection](./dj-set-detection.md) for detailed information.

## Getting Started

1. **Locate your database**: Check CleanCue settings for the database file path
2. **Access with SQLite tools**: Use any SQLite browser or command line tool
3. **Review the schema**: Start with the [Database Schema](./schema.md) documentation
4. **Try example queries**: Use the [Query Examples](./query-examples.md) as a starting point

## Important Notes

⚠️ **Read-Only Recommended**: While you can modify the database directly, it's recommended to make read-only queries to avoid data corruption.

⚠️ **Backup First**: Always backup your database before making any direct modifications.

⚠️ **Schema Changes**: This documentation reflects the current schema. Check the version in your CleanCue installation.

## Support

For questions about database access or schema changes, please refer to the CleanCue GitHub repository or documentation.