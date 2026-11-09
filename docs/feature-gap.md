# Feature Gap Analysis: Website vs Mobile App

This document outlines the feature gaps between the Decant Temcy website and the mobile application, and verifies backend API availability for the missing features.

## Feature Gap Table

| Feature | On Website | On Mobile | Backend API Ready | Effort |
| :--- | :---: | :---: | :---: | :---: |
| **Customer Features** | | | | |
| Home Page / Landing | ✅ | ✅ | ✅ | - |
| Product Catalog / Search | ✅ | ✅ | ✅ | - |
| Product Detail Page | ✅ | ✅ | ✅ | - |
| Cart Management | ✅ | ✅ | ✅ | - |
| Checkout Process | ✅ | ✅ | ✅ | - |
| Order History / Detail | ✅ | ✅ | ✅ | - |
| User Profile & Settings | ✅ | ✅ | ✅ | - |
| Address Book Management | ✅ | ✅ | ✅ | - |
| Wishlist / Favorites | ✅ | ✅ | ✅ | - |
| Review Submission | ✅ | ✅ | ✅ | - |
| Chatbot Interaction | ✅ | ✅ | ✅ | - |
| Notifications | ✅ | ✅ | ✅ | - |
| Order Tracking | ✅ | ✅ | ✅ | - |
| Google Login / Auth | ✅ | ✅ | ✅ | - |
| Forget/Reset Password | ✅ | ❌ | ✅ | Small |
| **Admin Features** | | | | |
| Admin Dashboard (Overview) | ✅ | ✅ | ✅ | - |
| Product Management (CRUD) | ✅ | ✅ | ✅ | - |
| Inventory/Stock Management | ✅ | ❌ | ✅ | Medium |
| Order Management (Status Update) | ✅ | ✅ | ✅ | - |
| Order Tracking Update (Courier/Resi) | ✅ | ❌ | ✅ | Medium |
| Review Management (Delete) | ✅ | ✅ | ✅ | - |
| Voucher Management (CRUD) | ✅ | ✅ | ✅ | - |
| Sales Report (Analytics) | ✅ | ✅ | ✅ | - |
| Sales Report Export (Excel/PDF) | ✅ | ❌ | ✅ (via reports) | Medium |
| Store/Branch Management | ✅ | ❌ | ✅ | Medium |
| AI Business Insight | ✅ | ❌ | ✅ | Medium |
| **SysAdmin Features** | | | | |
| User Management (List/Search) | ✅ | ✅ | ✅ | - |
| User Account Activation/Deactivation | ✅ | ✅ | ✅ | - |
| User Role & Permission Management | ✅ | ❌ | ✅ | Medium |
| User Account Creation/Editing | ✅ | ❌ | ✅ | Medium |
| System Configuration | ✅ | ❌ | ✅ | Medium |
| System Monitoring/Logs | ✅ | ❌ | ✅ | Medium |

## Detailed Notes

### System Administrator (SysAdmin) Role
- **Current Mobile State**: The mobile app has `AdminUserListScreen`, which allows admins to view users and toggle their active status.
- **Gaps**: The website allows for full User CRUD (creating new accounts, editing details, changing roles). These are missing in the mobile app but are supported by the backend (`/admin/users` POST/PUT endpoints).
- **System Config**: The website has `SysAdminConfig` and `SysAdminMonitoring` pages. The mobile app has no equivalent for system-level configuration or monitoring.

### Backend API Status
- All features implemented on the website have corresponding endpoints in the `./backend` directory (verified via `src/modules`).
- The website uses a unified backend, and the mobile app connects to the same API, meaning all "Missing" features are technically "Backend Ready".

### Effort Estimation
- **Small**: Simple UI screens (e.g., Password Reset).
- **Medium**: Complex forms or data-heavy screens (e.g., Inventory, System Config, User CRUD).
- **Large**: Features requiring new specialized libraries or complex logic (none identified as the backend is already complete).
