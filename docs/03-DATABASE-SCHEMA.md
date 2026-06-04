# Database Schema

## Overview

Mtaani Kiganjani uses **PostgreSQL** hosted on Supabase with **16 tables**, full **Row-Level Security (RLS)**, database triggers, and helper functions. All tables use UUIDs as primary keys.

---

## Entity Relationship Summary

```
users ──────────── applications ──────── payments
  │                    │                     │
  │                    ├── generated_documents
  │                    │
  ├── user_documents   ├── agreement_notifications
  │
  ├── profile_change_requests
  │
  ├── business_registrations
  │
  ├── client_relationships
  │
  └── sessions

locations ──── offices ──── services ──── service_categories

notifications          activity_logs
```

---

## Core Tables

### 1. `users` — Citizen, Staff, and Admin Profiles

The central table storing all system users. 60+ columns covering personal information, demographics, identification, location, diaspora status, verification, staff assignments, and emergency contacts.

| Column Group | Key Columns | Notes |
|-------------|-------------|-------|
| **Identity** | `id`, `citizen_id`, `first_name`, `middle_name`, `last_name` | `citizen_id` auto-generated |
| **Contact** | `email`, `phone`, `alternative_phone`, `photo_url` | Email is unique |
| **Demographics** | `sex`, `gender`, `date_of_birth`, `marital_status`, `occupation`, `education_level` | Enum-constrained |
| **National IDs** | `nida_number`, `passport_number`, `voter_id_number`, `driving_license_number` | NIDA is unique |
| **Location** | `region`, `district`, `ward`, `street`, `house_number` | Tanzania admin hierarchy |
| **Diaspora** | `is_diaspora`, `country_of_residence`, `city_of_residence` | For citizens abroad |
| **Verification** | `is_verified`, `email_verified`, `phone_verified`, `account_status` | Status: active/suspended/pending |
| **Role & Access** | `role` (citizen/staff/admin), `office_id`, `assigned_region`, `assigned_district` | Staff are ward-scoped |
| **Electronic Signatures** | `signature_url`, `stamp_url` | Base64 data URLs for staff |
| **Audit** | `created_at`, `updated_at`, `last_login` | Automatic timestamps |

### 2. `applications` — Service Requests

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users (applicant) |
| `service_id` | UUID | FK → services (nullable for hardcoded services) |
| `application_number` | TEXT | Human-readable (e.g., `TZ-MKZ-20260604-5380`) |
| `status` | TEXT | submitted / under_review / approved / rejected / returned / paid / issued / refunded |
| `form_data` | JSONB | Complete form submission including uploaded documents, signatures, officer approvals |
| `service_name` | TEXT | Denormalized for display |
| `fee` | DECIMAL | Service fee in TZS |
| `paid_at` | TIMESTAMPTZ | Payment timestamp |
| `payment_method` | TEXT | M-Pesa / TigoPesa / Airtel / Bank |
| `approved_at` | TIMESTAMPTZ | Approval timestamp |
| `approved_by` | UUID | FK → users (approving officer) |
| `feedback` | TEXT | Officer feedback or rejection reason |

**`form_data` JSONB Structure** (varies by service, always includes):
```json
{
  "applicant_name": "JOHN DOE",
  "photo_url": "data:image/jpeg;base64,...",
  "applicant_signature": "data:image/png;base64,...",
  "weo_signature": "data:image/png;base64,...",
  "weo_stamp": "data:image/png;base64,...",
  "weo_name": "Officer Name",
  "uploaded_documents": [
    { "type": "selfie", "name": "photo.jpg", "dataUrl": "data:...", "size": 123456 }
  ],
  "document_types": ["selfie", "id_front"],
  "service_name": "Utambulisho wa Mkazi",
  ...service_specific_fields
}
```

### 3. `payments` — Financial Transactions
Tracks all service fees and community contributions with transaction references, payment methods, and reconciliation status.

### 4. `generated_documents` — Issued Certificates
Records every document generated, linked to its application, with document type and generation metadata.

### 5. `locations` — Administrative Hierarchy
Hierarchical table: Region → District → Ward → Street, with `parent_id` self-reference.

### 6. `offices` — Government Offices
Ward/district offices with contact information, linked to locations.

### 7. `services` — Service Catalog
Configurable services with names (Swahili), fees, form schemas (JSONB), and validity periods.

### 8. `user_documents` — Identity Documents
Uploaded ID documents (NIDA card, passport scans) for verification purposes.

### 9. `profile_change_requests` — Citizen Profile Updates
When citizens request changes to verified information, these go through staff approval.

### 10. `business_registrations` — Business Permits
Business registration applications with separate approval workflow.

### 11. `notifications` — System Notifications
Application status updates, reminders, and system messages for users.

### 12. `activity_logs` — Audit Trail
Every significant action (login, approval, rejection, document generation) is logged with user, action type, and metadata.

---

## Row-Level Security Policies

| Table | Citizens | Staff | Admin |
|-------|----------|-------|-------|
| `users` | Own record only | Citizens in assigned region | All |
| `applications` | Own applications | All (for review) | All |
| `payments` | Own payments | All | All |
| `notifications` | Own notifications | Own | All |
| `user_documents` | Own documents | View for verification | All |

---

## Database Functions & Triggers

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Trigger on `auth.users` insert → creates `public.users` row |
| `create_citizen_profile()` | RPC for citizen profile creation with `is_verified` default |
| `get_user_role(uuid)` | Returns user role for RLS policies |
| `is_staff_or_admin(uuid)` | Boolean check for RLS |
| `is_admin(uuid)` | Boolean check for RLS |

---

## Indexes

- `users.email` — Unique
- `users.nida_number` — Unique
- `users.citizen_id` — Unique
- `applications.user_id` — FK index
- `applications.application_number` — Unique
- `applications.status` — For filtered queries
