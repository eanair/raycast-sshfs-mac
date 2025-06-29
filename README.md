# SSHFS-Mac Installation Guide

# SSHFS Manager - Raycast Extension

## Description

SSHFS Manager is a Raycast extension that serves as a user-friendly wrapper for macFUSE and sshfs-mac, providing simplified SSH filesystem mount management on macOS. This extension bridges the gap between complex terminal commands and intuitive interface design, allowing users to manage SSH filesystem connections directly through the Raycast launcher without requiring command-line expertise.

## Key Features

**Mount Point Management**: The extension creates and saves SSH mount points with persistent storage capabilities. Users can configure advanced SSHFS options including reconnection settings, server alive intervals, and connection timeouts through an intuitive form interface that translates to appropriate sshfs-mac command parameters.

**Dual Authentication Support**: The wrapper supports both SSH key-based authentication and password authentication methods by properly formatting and executing the underlying sshfs-mac commands. Password handling utilizes secure input methods with the password_stdin option to prevent credential exposure in system logs.

**Active Mount Monitoring**: Real-time monitoring of currently mounted SSHFS filesystems is achieved by parsing macFUSE mount table output and presenting the information in an accessible interface. Users can perform quick unmount operations that execute the appropriate umount or diskutil commands behind the scenes.

**Zombie Mount Cleanup**: The extension intelligently detects problematic mounts that become inaccessible due to network interruptions or abnormal terminations by analyzing both the macFUSE mount table and active sshfs-mac processes. It provides automated cleanup capabilities using force unmount operations and process termination when necessary.

**Multi-language Support**: Complete Korean and English localization ensures accessibility for international users, with persistent language preferences applied across all interface elements, error messages, and system feedback.

**Dynamic Command Discovery**: The extension implements intelligent path resolution to locate macFUSE and sshfs-mac installations across different macOS environments, including Intel and Apple Silicon systems with various Homebrew configurations.

## Technical Implementation

This wrapper extension translates user interactions into appropriate macFUSE and sshfs-mac command executions while providing enhanced error handling and user feedback. The modular TypeScript architecture separates command execution utilities, mount operation handlers, and zombie detection logic for maintainable code structure. Performance optimizations include command path caching and efficient mount status monitoring to minimize system overhead.

## Requirements and Dependencies

This extension requires macFUSE and sshfs-mac to be installed as underlying dependencies. The extension includes comprehensive installation guidance with step-by-step Homebrew instructions and system permission configuration details for macFUSE kernel extension approval. Without these dependencies, the extension cannot function as it relies entirely on these tools for actual SSH filesystem operations.

SSHFS Manager transforms the traditionally complex process of SSH filesystem management into an accessible Raycast experience while maintaining full compatibility with the robust functionality provided by macFUSE and sshfs-mac.

## Installation Process

### 1. Installation via Homebrew
\`\`\`bash
# Install macFUSE
brew install --cask macfuse

# Install sshfs-mac
brew install gromgit/fuse/sshfs-mac
\`\`\`

### 2. System Permission Configuration
1. Navigate to **System Settings** > **Privacy & Security**
2. In the **Security** section, approve macFUSE kernel extension
3. System restart may be required