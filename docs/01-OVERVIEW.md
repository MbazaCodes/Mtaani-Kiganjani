# Mtaani Kiganjani — Tanzania Digital Local Government Services Portal

> **"Huduma za Serikali ya Mtaa Kidijitali"**
> *Empowering Citizens Through Digital Local Governance*

---

## Executive Summary

**Mtaani Kiganjani** (meaning "Digital Neighborhood" in Swahili) is a comprehensive web-based platform that digitizes local government services at the Ward/Mtaa level across Tanzania. It replaces paper-based processes with a modern, bilingual (Swahili/English), mobile-first portal where citizens can apply for permits, certificates, and agreements — and government officers can review, approve, and issue official documents electronically.

The system serves **three user roles** across the full service lifecycle:

| Role | Swahili | Capabilities |
|------|---------|-------------|
| **Citizen** | Mwananchi | Apply for services, upload documents, sign electronically, track status, download certificates |
| **Staff** | Afisa | Review applications, verify documents, approve/reject, manage citizens in their ward |
| **Admin** | Msimamizi | Full system management, user creation, service configuration, audit logs, all-region access |

---

## Problem Statement

Tanzania's local government offices (Ofisi ya Serikali ya Mtaa) currently process citizen requests through:

- **Paper forms** requiring in-person visits, often multiple trips
- **Manual record-keeping** prone to loss, fraud, and delays
- **No tracking mechanism** — citizens cannot check application status
- **No standardization** — document formats vary by ward
- **No verification** — documents are easily forged with no QR validation

This creates bottlenecks, corruption opportunities, and citizen frustration — particularly for diaspora Tanzanians who cannot visit offices in person.

## Solution

Mtaani Kiganjani provides:

1. **Online application submission** with guided multi-step forms, document upload, and electronic signatures
2. **Real-time status tracking** from submission through approval to document issuance
3. **Automated PDF generation** with official government letterheads, QR codes for verification, officer signatures, and official stamps
4. **Mobile-first design** optimized for smartphone access (Tanzania's primary internet device)
5. **Bilingual interface** (Swahili default, English available) reflecting Tanzania's official languages
6. **Secure payment integration** supporting M-Pesa, TigoPesa, Airtel Money, and bank transfers
7. **Role-based access control** ensuring staff only access citizens in their assigned ward/region
8. **QR-code document verification** allowing any institution to validate a certificate's authenticity

---

## Services Offered (9 Digital Services)

| # | Service (Swahili) | English | Description |
|---|-------------------|---------|-------------|
| 1 | Utambulisho wa Mkazi | Certificate of Residency | Official proof of residence in a ward |
| 2 | Kibari cha Mazishi | Burial Permit | Authorization for burial ceremonies |
| 3 | Kibari cha Sherehe | Event/Celebration Permit | Permission for weddings, parties, concerts |
| 4 | Kibari cha Ujezi Mdogo | Minor Construction Permit | Approval for small-scale building works |
| 5 | Barua ya Utambulisho | Introduction Letter | Official letter for employment, school, etc. |
| 6 | Makubaliano ya Mauzo | Sales Agreement | Witnessed property/asset sale contract |
| 7 | Makubaliano ya Pango | Rental Agreement | Witnessed tenancy/lease contract |
| 8 | Mgogoro na Mashauri | Dispute Resolution | Filing and tracking community disputes |
| 9 | Malipo na Michango | Payments & Contributions | Ward-level fees and community contributions |

---

## Key Differentiators

- **Tanzania-specific**: Built with Tanzania's administrative structure (Regions → Districts → Wards → Streets), NIDA integration, and TZS currency
- **Offline-ready architecture**: Forms save progress locally; critical data cached
- **Zero infrastructure cost**: Runs entirely on cloud services (Vercel + Supabase) — no physical servers needed
- **Scalable**: From a single ward to nationwide deployment with the same codebase
- **Open and auditable**: Full activity logging, QR verification, and transparent processes

---

## Live Deployment

**Production URL**: [https://mtaani-kiganjani-two.vercel.app](https://mtaani-kiganjani-two.vercel.app)

---

*For detailed technical documentation, see the other files in this `docs/` folder.*
