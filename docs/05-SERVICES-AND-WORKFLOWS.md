# Services & Workflow Guide

## Service Lifecycle

Every service follows this standardized workflow:

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ CITIZEN   │    │ STAFF     │    │ CITIZEN   │    │ CITIZEN   │    │ VERIFIED  │
│ Applies   │───▶│ Reviews   │───▶│ Pays Fee  │───▶│ Downloads │───▶│ QR Code   │
│           │    │ Approves  │    │           │    │ Document  │    │ Validates │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
   status:         status:         status:         status:
   submitted       approved        paid            issued
```

---

## Detailed Service Descriptions

### 1. Utambulisho wa Mkazi (Certificate of Residency)

**Purpose**: Official proof that a citizen resides in a specific ward. Required for employment verification, school enrollment, opening bank accounts, and accessing public services.

**Form fields** (8 steps):
- Personal information (auto-filled from profile/NIDA)
- Residence details (region, district, ward, street, house number)
- Property information (ownership status, years at residence)
- Household composition (spouse, children, dependents, elderly)
- Employment details
- Document uploads (selfie, NIDA front/back, proof of residence)
- Consent and electronic signature

**Fee**: 2,000 TZS | **Certificate includes**: Profile photo, QR verification code, officer signature + stamp

---

### 2. Kibari cha Mazishi (Burial Permit)

**Purpose**: Authorization to conduct a burial ceremony, required by law before interment.

**Form fields** (6 steps):
- Deceased personal information (name, NIDA, date of birth, date of death)
- Cause and place of death, hospital/morgue details
- Burial location and date
- Next of kin / applicant relationship
- Document uploads (death certificate, NIDA of deceased)
- Consent and signature

**Fee**: 5,000 TZS | **Includes**: Age-at-death calculation, ceremony details

---

### 3. Kibari cha Sherehe (Event/Celebration Permit)

**Purpose**: Permission to hold public or private events (weddings, concerts, religious gatherings, political rallies).

**Form fields**:
- Event type (wedding, birthday, cultural, religious, concert, political, etc.)
- Event name, expected guest count
- Venue details (name, ward, district)
- Date, time, duration
- Organizer contact information
- Safety considerations (alcohol, food vendors, security, noise level)
- Consent and signature

**Fee**: 10,000 TZS | **Includes**: Event banner with type and guest count

---

### 4. Kibari cha Ujezi Mdogo (Minor Construction Permit)

**Purpose**: Approval for small-scale building works (renovations, extensions, fencing) that don't require full municipal planning permission.

**Form fields**:
- Property details (plot number, ownership status)
- Construction type and description
- Estimated cost and timeline
- Contractor information (if applicable)
- Neighbor notification status
- Document uploads (site plan, property deed)
- Consent and signature

**Fee**: 15,000 TZS | **Includes**: Property location details, construction scope

---

### 5. Barua ya Utambulisho (Introduction Letter)

**Purpose**: Official letter from the ward office introducing a citizen to institutions (employers, schools, banks, government offices, embassies).

**Unique features**:
- **Multi-institution support**: One application can generate separate letters for multiple institutions
- **Application types**: Self, Minor (for children), On Behalf (for represented parties)
- **Template-based**: Professional government letter format with addressee, body, and sign-off

**Fee**: 3,000 TZS per institution | **Includes**: Official letterhead, addressed to specific institution

---

### 6. Makubaliano ya Mauzo (Sales Agreement)

**Purpose**: Officially witnessed property/asset sale contract between a seller and buyer.

**Form fields**:
- Seller details (auto-filled from profile)
- Buyer details (name, NIDA, phone)
- Asset/property description, location, value
- Payment terms and conditions
- Witness information
- Both parties' consent

**Fee**: 20,000 TZS | **Includes**: Two-party signatures, officer witness signature + stamp

---

### 7. Makubaliano ya Pango (Rental Agreement)

**Purpose**: Officially witnessed tenancy/lease contract between a landlord and tenant.

**Form fields** (9 steps):
- Landlord details (auto-filled if landlord is the submitter)
- Tenant details
- Property description (address, room count, floor, amenities)
- Lease terms (start date, duration, rent amount in TZS, deposit)
- House rules and conditions
- Utility responsibilities
- Witness information (2 witnesses required)
- Consent and signatures

**Fee**: 15,000 TZS | **Includes**: Four-signature grid (landlord, tenant, 2 witnesses) + officer

---

### 8. Mgogoro na Mashauri (Dispute Resolution)

**Purpose**: Filing community disputes and civil complaints for mediation by the ward office.

**Two modes**:
- **Dispute** (mgogoro): Between two named parties with witness support
- **Community Issue** (tatizo la jamii): General community problem report

**Form fields**:
- Dispute type and description
- Complainant details (auto-filled)
- Respondent details (for disputes)
- Issue location and evidence
- Desired resolution
- Witness information

**Fee**: 5,000 TZS (disputes) / Free (community issues)

---

### 9. Malipo na Michango (Payments & Contributions)

**Purpose**: Ward-level fees, community contributions, and development levies.

**Types**: Security contribution, cleaning levy, development fund, water, electricity, other

**Form fields**:
- Contribution type and amount
- Period (monthly/quarterly/annual)
- Payment method preference
- Consent and signature

**Fee**: Variable

---

## Document Generation

Every approved application generates an official PDF with:

| Element | Description |
|---------|-------------|
| **Government letterhead** | Tanzania coat of arms, "JAMHURI YA MUUNGANO WA TANZANIA" |
| **Application number** | Unique reference (e.g., `TZ-MKZ-20260604-5380`) |
| **Citizen photo** | Profile photo embedded in the document |
| **Applicant signature** | Electronic signature drawn during application |
| **Officer signature** | Ward Executive Officer's saved signature |
| **Official stamp** | Ward office stamp uploaded by the officer |
| **QR verification code** | Scannable code linking to verification endpoint |
| **Bilingual content** | Swahili primary with English labels |

---

## Payment Methods

| Method | Provider | Process |
|--------|----------|---------|
| M-Pesa | Vodacom | Enter phone → USSD push → Confirm on phone |
| TigoPesa | Tigo | Enter phone → USSD push → Confirm on phone |
| Airtel Money | Airtel | Enter phone → USSD push → Confirm on phone |
| NMB Bank | NMB | Enter account → Transfer reference |
| CRDB Bank | CRDB | Enter account → Transfer reference |

*Currently simulated with realistic UI — production integration requires MNO API agreements.*
