# User Roles & Permissions

## Role Hierarchy

```
                    ┌─────────┐
                    │  ADMIN  │  Full system access
                    │ Msimamizi│  All regions, all functions
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │  STAFF  │  Ward-level access
                    │  Afisa  │  Assigned region only
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │ CITIZEN │  Personal access
                    │Mwananchi│  Own data only
                    └─────────┘
```

---

## Citizen (Mwananchi)

### Access Level
- Own profile, own applications, own documents, own notifications

### Capabilities

| Feature | Description |
|---------|-------------|
| **Sign Up / Login** | Email + password authentication with email confirmation |
| **Profile Management** | Full demographic profile with NIDA, photo, address, diaspora status |
| **Apply for Services** | Multi-step guided forms for all 9 government services |
| **Upload Documents** | Selfie, NIDA card, proof of residence, supporting documents |
| **Electronic Signature** | Draw signature on screen for application authentication |
| **Track Applications** | Real-time status from submission to document issuance |
| **Make Payments** | Mobile money (M-Pesa/TigoPesa/Airtel) and bank transfers |
| **Download Certificates** | Official PDF documents with QR verification |
| **Share Documents** | Share certificates via Web Share API or clipboard |
| **View Notifications** | Application updates, approval notices, payment confirmations |

### Navigation
Dashboard → Services → Apply → My Applications → Profile → Notifications

---

## Staff (Afisa wa Mtaa)

### Access Level
- Citizens within assigned region/district
- All applications (for review)
- Staff-specific management tools

### Capabilities

| Feature | Description |
|---------|-------------|
| **Staff Dashboard** | Statistics: pending, paid, approved, rejected counts |
| **Application Review** | View full form data, uploaded documents, approve/reject/request info |
| **Citizen Management** | View citizens in assigned ward, confirm emails, verify profiles |
| **Document Verification** | Manual NIDA verification workflow |
| **Business Approvals** | Review business registration applications |
| **Customer Support** | Handle citizen inquiries and complaints |
| **Signature & Stamp** | Save reusable electronic signature and official stamp for certificates |
| **Citizen Database** | Search and filter citizens in assigned region (read-only for other regions) |

### Staff Assignment
- Each staff member has `assigned_region` and `assigned_district` in their profile
- The citizen database filters automatically to show only citizens in their jurisdiction
- Application review is not region-filtered (staff can review any application assigned to them)

### Navigation
Staff Dashboard → Review Applications → Citizens → Verification → Business → Support → Profile

---

## Admin (Msimamizi)

### Access Level
- Full system access across all regions
- User management (create/delete staff and admin accounts)
- System configuration

### Capabilities

All Staff capabilities PLUS:

| Feature | Description |
|---------|-------------|
| **Admin Dashboard** | System-wide statistics, recent activity, performance metrics |
| **Staff Management** | Create staff/admin accounts, reset passwords, assign regions |
| **Citizen Database** | All citizens nationwide with region/district search and filter |
| **Service Management** | Configure services, fees, form schemas, enable/disable |
| **Office Management** | Manage ward offices, contact information, locations |
| **Location Management** | Manage administrative hierarchy (regions → districts → wards) |
| **Activity Logs** | Full audit trail of all system actions |

### Navigation
Admin Dashboard → Staff Mgmt → Citizens → Services → Offices → Locations → Logs → Profile

---

## Permission Matrix

| Action | Citizen | Staff | Admin |
|--------|:-------:|:-----:|:-----:|
| View own profile | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |
| Apply for services | ✅ | ❌ | ❌ |
| Track own applications | ✅ | ❌ | ❌ |
| Download own documents | ✅ | ❌ | ❌ |
| Review applications | ❌ | ✅ | ✅ |
| Approve / reject | ❌ | ✅ | ✅ |
| Confirm citizen email | ❌ | ✅ | ✅ |
| View all citizens (own region) | ❌ | ✅ | ✅ |
| View all citizens (all regions) | ❌ | ❌ | ✅ |
| Create staff accounts | ❌ | ❌ | ✅ |
| Manage services | ❌ | ❌ | ✅ |
| View activity logs | ❌ | ❌ | ✅ |
| Delete user accounts | ❌ | ❌ | ✅ |
| Save signature/stamp | ❌ | ✅ | ✅ |

---

## Account Creation Flow

### Citizen
1. Self-registration via sign-up page
2. Email confirmation
3. Profile completion (NIDA, address, photo)
4. Ready to use all citizen services

### Staff
1. Admin creates account via Staff Management
2. Email pre-confirmed (no confirmation email needed)
3. Admin assigns region and district
4. Staff logs in and sets up signature + stamp

### Admin
1. First admin: manually set role in database
2. Subsequent admins: created by existing admin via Staff Management
