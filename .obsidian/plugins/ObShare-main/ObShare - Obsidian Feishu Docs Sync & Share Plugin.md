# ObShare - Obsidian Feishu Docs Sync & Share Plugin
🚀 One-time Setup, Easy to Use - A Feishu Doc-based solution for Obsidian note syncing and sharing 

[中文](README.md)|[English](README-EN.md)

[![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)](https://github.com/your-repo/ob-share)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.9.12+-purple.svg)](https://obsidian.md/)

## ✨ Core Features

### 🔒 Privacy First
🛡️ **Local Encryption Storage** - All sensitive configuration data (App ID, App Secret, User ID, etc.) are encrypted locally using AES-GCM 256-bit encryption
🔐 Zero Data Collection - The plugin collects, analyzes, or shares no user data; all processing occurs locally
👁️ Fully Transparent - Open-source code, auditable, with no monitoring, tracking, or ads
🚫 No Network Listening - Communicates with the Feishu API only upon explicit user action

### 🎯 One-Click Sharing Experience
📤 One-Click Upload - Quickly share current document as a Feishu Doc via right-click menu or command palette
🎨 Intelligent Conversion - Automatically converts various Obsidian formats
🖼️ Image Handling - Automatically uploads and converts local image links
⚙️ Flexible Permissions - Fine-tune document visibility, copy permissions, and more

### 📊 Convenient Management
📋 Upload History - Complete record of uploads with ability to reconfigure permissions
🔄 Real-time Progress - Live upload progress bar for clear status awareness
📈 Usage Statistics - API call count tracking to help manage usage frequency

## 🚀 Quick Start

### Step 1: Install the Plugin
In Obsidian, open Settings → Community plugins
Disable Safe mode
Click Browse and search for "ObShare" to install
Enable the plugin

### Step 2: Configure Your Feishu Application (One-Time Only)
⏱️ Estimated setup time: 5–10 minutes 
📋 Preparation Checklist
Feishu account
Created Feishu application
Obtained application credentials
Created target folder
🔧 Detailed Configuration Steps
Full Configuration Guide: Please refer to [Quick Setup for ObShare](https://itlueqqx8t.feishu.cn/docx/XUJmdxbf7octOFx3Vt0c3KJ3nWe)

### Step 3: Start Using

#### 🎯 Three Upload Methods
Command Palette: Ctrl/Cmd + P → Search "Share current document to Feishu"
Right-click Menu: Right-click in the file list → "Share this page"
Toolbar Button: Click the share icon in the left toolbar
<img width="172" height="76" alt="490f534d-b252-45bb-aed1-268df370511a" src="https://github.com/user-attachments/assets/444b543b-f1ee-4633-96d9-86215ab19eaf" />
<img width="597" height="332" alt="359285e9-8279-4a67-8359-bc395703964a" src="https://github.com/user-attachments/assets/c50fc22f-9e09-49be-bc84-6529560f5764" />

#### ⚙️ Permission Settings
After uploading, you can easily configure document permissions:
🌐 Public Access: Allow anyone with the link to view
📋 Allow Copying: Permit viewers to copy content
📄 Allow Downloading: Permit creating copies, printing, and downloading
<img width="564" height="510" alt="6b129536-f084-4887-86e9-4b1bbb0c5610" src="https://github.com/user-attachments/assets/9af947b6-dcf8-4d72-b908-cda0cef8fd62" />

#### 🖼️ Automatic Image Handling
Automatically uploads local images to Feishu
Converts image links to Feishu-compatible format
Supports multiple image formats

#### 📊 Usage Statistics
Real-time display of monthly API call count
Count of uploaded documents
Helps you manage usage frequency appropriately
You can view all upload records in Obsidian settings and directly manage your documents there
<img width="819" height="533" alt="b7f957a2-0c33-405a-95f9-ba61459818e6" src="https://github.com/user-attachments/assets/81f2f411-49f9-4211-a807-f6e39c00562d" />

## 🛡️ Security & Privacy
🔐 Data Encryption
Encryption Algorithm: AES-GCM 256-bit
Key Generation: Fixed key derived from device-specific characteristics
Encrypted Data: App ID, App Secret, Folder Token, User ID
Storage Location: Only within your local data.json file
🔒 Data Flow
```
Your Device ←→ Feishu API
     ↑
   Only this path
```
Data flows exclusively between your device and Feishu—never passes through any third-party server.

## 📋 System Requirements
Obsidian: 1.9.12 or higher
Platform: Windows, macOS, Linux
Network: Requires access to Feishu API (open.feishu.cn)

## 🆘 Frequently Asked Questions

Q: I can't upload after configuration?
A: Please check:
Is your network connection stable?
Are Feishu application permissions correctly configured?
Are your User ID and Folder Token correct?
Click "Test Connection" to validate your settings.

Q: The uploaded document formatting is incorrect?
A: The plugin automatically converts standard formats. Some complex or non-standard Markdown documents may require manual adjustment. If you encounter issues or wish us to optimize specific cases in future versions, please fill out our survey: User Experience Survey .

Q: How do I delete an uploaded document?
A: Delete it from the "Upload History" in plugin settings. This removes both your upload record and the corresponding cloud document on Feishu—but does not affect your local Obsidian file.

Q: I'm concerned about data security?
A: The plugin is fully open-source—you can audit the code. All sensitive data is encrypted locally and never uploaded to any third-party server.

Q: Does this plugin collect my data?
A: Absolutely not. This plugin uses your own Feishu API keys to convert formats locally, call Feishu APIs, and upload directly to Feishu servers. All actions are under your full control and involve no third-party servers.

Q: Can I upload all my content to Feishu Doc?
A: Due to limitations on Feishu storage space and API quotas, batch uploads are not currently supported. Additionally, if you enable public internet access for your documents, you must comply with Feishu’s governance policies. Once enabled, anyone with the link can access the document. As the document owner, you are responsible for ensuring its legal and compliant use. Any disputes arising from this are unrelated to this plugin.

## 🤝 Contribute
Pull requests and issues are welcome!we also need your feedback via the survey [user survey](https://f.wps.cn/g/DLUqR4jB)

📄 License
This project is licensed under the MIT License .

🙏 Acknowledgments
Obsidian - The finest note-taking app
Feishu Open Platform - Providing powerful APIs and exceptionally clear documentation
All contributors and users for your support



