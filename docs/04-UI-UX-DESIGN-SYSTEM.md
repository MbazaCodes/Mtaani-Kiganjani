# UI/UX Design System

## Design Philosophy

Mtaani Kiganjani's interface is designed for **Tanzania's mobile-first population**. Over 85% of Tanzanian internet users access the web via smartphones, often on slower connections. Every design decision prioritizes:

1. **Mobile-first**: Touch-friendly targets (min 44px), thumb-reachable actions, responsive breakpoints
2. **Low-bandwidth awareness**: Minimal asset loading, text-first UI, progressive enhancement
3. **Bilingual clarity**: Swahili is the default language; every string has an English equivalent
4. **Government trust**: Professional, clean aesthetic that reflects official government communications
5. **Accessibility**: High contrast ratios, clear typography, screen-reader compatible markup

---

## Color Palette

| Color           | Hex       | Usage                                           |
| --------------- | --------- | ----------------------------------------------- |
| **Emerald 600** | `#059669` | Primary actions, submit buttons, success states |
| **Emerald 50**  | `#ecfdf5` | Light backgrounds, success panels               |
| **Stone 700**   | `#44403c` | Primary text                                    |
| **Stone 400**   | `#a8a29e` | Secondary text, hints                           |
| **Stone 200**   | `#e7e5e3` | Borders, dividers                               |
| **Red 500**     | `#ef4444` | Errors, rejection, danger actions               |
| **Blue 600**    | `#2563eb` | Information, links                              |
| **Amber 500**   | `#f59e0b` | Warnings, pending states                        |
| **Purple 600**  | `#7c3aed` | Accent (event permits)                          |
| **White**       | `#ffffff` | Card backgrounds                                |

The emerald-to-teal gradient reflects Tanzania's natural landscape and creates a distinctive, recognizable government brand.

---

## Typography

| Element         | Size            | Weight       | Font                       |
| --------------- | --------------- | ------------ | -------------------------- |
| Page titles     | 24px (text-2xl) | Bold (700)   | System sans-serif          |
| Section headers | 14px (text-sm)  | Bold (700)   | Uppercase + tracking-wider |
| Body text       | 14px (text-sm)  | Normal (400) | System sans-serif          |
| Form labels     | 12px (text-xs)  | Bold (700)   | Uppercase + tracking-wider |
| Helper text     | 12px (text-xs)  | Normal (400) | Stone-400 color            |
| Error messages  | 12px (text-xs)  | Normal (400) | Red-500 color              |

System font stack ensures fast loading without web font downloads.

---

## Component Library

### Layout Components

- **AppShell**: Sidebar (desktop) + bottom nav (mobile) + header
- **Sidebar**: Collapsible navigation with role-based menu items
- **MobileNav**: Fixed bottom tab bar for mobile (5 primary actions)
- **ProtectedRoute**: Auth-gated wrapper with role checks

### Form Components

- **Multi-step wizard**: Step indicator with progress percentage
- **Field**: Labeled input wrapper with validation state
- **Sel**: Select dropdown with search and error state
- **TI**: Text input with auto-clear-error-on-type
- **SignaturePad**: Canvas-based electronic signature (touch + mouse)
- **DynamicFormGenerator**: Schema-driven form renderer for configurable services

### Data Display

- **StatCard**: Dashboard metric card with icon + value + label
- **StatusBadge**: Color-coded application status indicator
- **ApplicationProgressBar**: Visual pipeline from submission to issuance
- **InfoItem**: Key-value display row

### PDF Documents

- **9 document templates**: Each with Tanzania government letterhead, QR verification code, signature blocks, and official stamp placement
- **CertificatePDFDocument**: Wrapper that resolves the correct template by service type

---

## Layout Patterns

### Desktop (≥768px)

```
┌──────────┬────────────────────────────────────────┐
│          │                                         │
│ Sidebar  │           Main Content                  │
│ (240px)  │                                         │
│          │                                         │
│ • Home   │   ┌─────────────────────────────┐      │
│ • Apply  │   │    Page Content              │      │
│ • Apps   │   │                              │      │
│ • Profile│   └─────────────────────────────┘      │
│          │                                         │
└──────────┴────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌────────────────────────────────┐
│ Header (sticky)                │
├────────────────────────────────┤
│                                │
│       Main Content             │
│       (full width)             │
│                                │
├────────────────────────────────┤
│ ● Home  ● Apply  ● Apps  ● Me │  ← Bottom tab bar (fixed)
└────────────────────────────────┘
```

---

## Interaction Patterns

### Form Submission Flow

1. **Select service** → Service card grid with descriptions and fees
2. **Fill form** → Multi-step wizard with progress bar (Step 1 of 8)
3. **Upload documents** → Drag-and-drop or tap with camera access
4. **Sign electronically** → Canvas signature pad on the final step
5. **Review & submit** → Full preview of all entered data
6. **Confirmation** → Success screen with application number

### Application Tracking

- **Status timeline**: Visual progression with timestamps
- **Detail slide-over panel**: Click a row → right panel shows full details
- **Color-coded statuses**: Green (approved), amber (pending), red (rejected), blue (info)

### Payment Flow

1. Select payment method (M-Pesa / TigoPesa / Airtel / Bank)
2. Enter phone number or account details
3. Mock processing with realistic feedback
4. Success → status changes to "paid" → download enabled

---

## Responsive Breakpoints

| Breakpoint | Width      | Adaptation                               |
| ---------- | ---------- | ---------------------------------------- |
| Mobile     | < 640px    | Single column, bottom nav, stacked cards |
| Tablet     | 640-1023px | 2-column grids, sidebar collapses        |
| Desktop    | ≥ 1024px   | Full sidebar, multi-column layouts       |

---

## Animation Guidelines

- **Page transitions**: Framer Motion `fadeIn` + subtle `y: 10px` slide (200ms)
- **Button interactions**: Scale on hover (1.02), opacity on disabled
- **Loading states**: Spinner icons (`Loader2` with `animate-spin`)
- **Status changes**: Color transitions (200ms ease)
- **No unnecessary animation**: Government context requires professionalism

---

## Accessibility

- All interactive elements have visible focus states (ring-2 emerald)
- Form errors announced with icon + text (not color alone)
- Touch targets minimum 44×44px
- Semantic HTML structure (headings, landmarks, labels)
- Color contrast ratios meet WCAG AA standard
