# SysAdmin Feature Gap Audit (Updated)

This document tracks the parity between the website and mobile application specifically for the System Administrator (SysAdmin) role.

## Feature Gap Table

| Feature | On Website | On Mobile | Backend API Ready | Status |
| :--- | :---: | :---: | :---: | :--- |
| **User Management (List/Search)** | ✅ | ✅ | ✅ | Implemented |
| **User Activation/Deactivation** | ✅ | ✅ | ✅ | Implemented |
| **User Account Creation/Editing** | ✅ | ✅ | ✅ | Implemented (New Screens & API) |
| **User Role & Permission Mgmt** | ✅ | ✅ | ✅ | Implemented (via User Form) |
| **System Configuration** | ✅ | ❌ | ✅ | Gap |
| **System Monitoring/Logs** | ✅ | ❌ | ✅ | Gap |
| **Dedicated SysAdmin Navigation** | ✅ | ✅ | ✅ | Implemented (SysAdminTabNavigator) |
| **Dedicated SysAdmin Profile** | ✅ | ✅ | ✅ | Implemented (SysAdminProfileScreen) |

## Implementation Summary
- **User CRUD**: Added `AdminUserFormScreen.js` and integrated `createUser`/`updateUser` API calls via `adminService.js`.
- **Backend**: Implemented `POST /api/admin/users` and `PUT /api/admin/users/:id` in the backend admin controller.
- **RBAC**: Expanded database role ENUM and added `authorizeSysAdmin` middleware.
- **Navigation**: Created `SysAdminTabNavigator.js` to decouple SysAdmin experience from standard Admin experience.
- **Profile**: Created `SysAdminProfileScreen.js` with specialized branding and secure logout.
