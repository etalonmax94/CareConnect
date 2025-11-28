# Design Guidelines: EmpowerLink Healthcare CRM

## Design Approach

**Selected Framework:** Ant Design System with Mobile-First Enhancements
**Rationale:** Enterprise-grade data management with enhanced mobile usability for support workers in the field. Professional healthcare aesthetic balanced with approachable, encouraging interactions.

**Core Principles:**
- **Simplicity First:** One primary action per screen, progressive disclosure for complexity
- **Mobile-Native:** Touch-optimized interactions, bottom navigation, thumb-friendly zones
- **Encouraging Support:** Friendly confirmations, progress celebrations, helpful empty states
- **Efficiency:** Smart defaults, quick actions, minimal clicks to complete tasks
- **Professional Warmth:** Navy blue professional foundation with approachable micro-interactions

---

## Typography

**Font Stack:** Inter or System UI (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)

**Hierarchy:**
- **Mobile Headers:** text-xl font-semibold (larger touch targets for navigation)
- **Desktop Page Titles:** text-2xl font-semibold
- **Section Headers:** text-lg font-medium
- **Body Text:** text-base (mobile), text-sm (desktop) - larger for mobile readability
- **Labels:** text-sm font-medium with subtle spacing
- **Helper Text:** text-xs for secondary information
- **Monospace:** Client IDs, NDIS numbers - `font-mono text-sm`

---

## Layout System

**Spacing Primitives:** Tailwind units **4, 6, 8, 12, 16, 20**
- **Mobile padding:** p-4 to p-6 (thumb-friendly spacing)
- **Desktop padding:** p-6 to p-8
- **Section spacing:** space-y-6 (mobile), space-y-8 (desktop)
- **Card internal:** p-6 with gap-4 for content
- **Touch targets:** Minimum h-12 (48px) for all interactive elements

**Container Strategy:**
- **Mobile:** Full width with px-4 side padding
- **Desktop:** max-w-7xl mx-auto px-6 lg:px-8
- **Dashboard grids:** grid-cols-1 (mobile) → grid-cols-2 (tablet) → grid-cols-3 (desktop)

---

## Component Library

### Navigation

**Mobile Bottom Navigation (Primary):**
- Fixed bottom bar with h-16, safe-area padding
- 4-5 main tabs: Dashboard, Clients, Tasks, Documents, More
- Large icons (w-6 h-6) with text-xs labels below
- Active state: Navy blue with subtle scale animation
- Tab badges for pending items (small pill counters)

**Desktop Sidebar:**
- Fixed left sidebar w-64 with collapsible states
- Grouped navigation: Dashboard, Client Management, Documents, Reports, Settings
- Category filters as nested items under Clients
- Active state: Navy blue background with left accent border

**Top Bar (Both):**
- Mobile: Logo + notification bell + user avatar (h-14)
- Desktop: Logo + search + quick actions + user profile (h-16)
- Search: Expandable on mobile, always-visible on desktop

### Dashboard Components

**Stats Cards (Welcome Screen):**
- Large, friendly greeting: "Good morning, [Name]!" with time-based messaging
- Key metrics grid: 2 columns mobile, 3-4 columns desktop
- Card structure: Large number + icon + label + encouraging micro-copy ("Great job!" for compliance)
- Padding: p-6 with rounded-xl and subtle shadows

**Quick Actions Panel:**
- Prominent FAB-style primary action on mobile (bottom-right, navy blue)
- Desktop: Action button row with "Add Client", "Log Visit", "Upload Document"
- Touch target: min-h-12 with px-6 spacing

**Today's Tasks/Visits:**
- Timeline card showing today's scheduled visits
- Client photo + name + time + location + quick "Start Visit" button
- Empty state: Friendly illustration + "No visits today - time to catch up on notes!"

### Client Management

**Client List (Mobile):**
- Card-based layout (not table)
- Each card: Photo (w-12 h-12) + Name + Category badge + compliance status dot + chevron
- Swipe actions: Quick call, message, view documents
- Search/filter: Sticky header with category chips (NDIS, Aged Care, Private)

**Client List (Desktop):**
- Sortable table with photo, name, category, care manager, status, last visit
- Inline actions: View, Edit, Documents
- Bulk actions: Checkbox select with action bar

**Client Profile:**
- Mobile: Single column with tabbed sections (Details, Documents, Visits, Notes)
- Desktop: 2-column (70/30 split) - main content + sidebar quick info
- Profile header: Large photo, name, category badge, key identifiers
- Floating action button: "Log New Visit" (mobile) or primary button (desktop)

### Visit Logging (Mobile-Critical)

**Visit Entry Flow:**
- Step indicator showing progress (1 of 3)
- Single-question per screen approach
- Large touch-friendly inputs: Time picker, service type selector, notes field
- Voice-to-text option for notes entry
- Photo upload: Large drop zone with camera integration
- Success screen: Celebration animation + "Visit logged! Great work 👍"

### Document Management

**Document Grid:**
- Mobile: Stacked cards with document icon + name + status + due date
- Desktop: Grid view with 3-4 columns
- Status indicators: Large, clear icons (check, clock, alert) with navy blue coding
- Upload: Full-screen modal on mobile, sidebar panel on desktop
- Progress bars: Visual upload progress with encouraging messages

### Forms & Inputs

**Mobile-Optimized Inputs:**
- Large touch targets: h-12 inputs with text-base
- Full-width inputs on mobile, smart 2-column on desktop
- Date/time pickers: Native mobile pickers, calendar widgets on desktop
- Dropdowns: Bottom sheet on mobile, standard dropdown on desktop
- File upload: Camera/gallery integration on mobile, drag-drop on desktop

**Form Patterns:**
- Single-column stacking on mobile
- Grouped sections with bg-gray-50 cards
- Sticky bottom action bar: Primary button + secondary link
- Inline validation: Friendly error messages with icons
- Auto-save indicators: "Saving..." → "All changes saved ✓"

### Status & Feedback

**Category Badges:**
- Rounded-full pills with clear labels
- Touch-friendly size: px-4 py-1.5
- NDIS, Aged Care, Private with distinct navy blue variations

**Success States:**
- Toast notifications with icons and friendly copy: "Client added successfully! 🎉"
- Confetti animation for milestones (100% compliance achieved)
- Progress celebrations: "5 visits logged this week - you're on fire!"

**Empty States:**
- Friendly illustrations (not stock photos)
- Encouraging copy: "No documents overdue - keep up the great work!"
- Clear call-to-action button

**Loading States:**
- Skeleton screens for content loading
- Spinner with encouraging messages: "Loading your clients..."

---

## Responsive Behavior

**Mobile-First Breakpoints:**
- **Base (mobile):** Single column, bottom nav, full-screen modals, card layouts
- **md (tablet):** 2-column grids, sidebar peek, larger touch targets maintained
- **lg (desktop):** 3-column grids, full sidebar, table views, split panels

**Touch Considerations:**
- All buttons: min-h-12 with min-w-12
- Spacing between interactive elements: minimum gap-4
- Bottom navigation: Elevated z-50 above all content
- Thumb zone optimization: Critical actions in bottom 2/3 of screen (mobile)

---

## Accessibility & Tone

**Interactions:**
- Focus states: Navy blue ring with ring-2
- Keyboard navigation: Full support with visible focus
- Screen reader labels: Descriptive text for all icons
- Color contrast: WCAG AA compliant throughout

**Friendly Microcopy:**
- Button labels: "Save Changes" not "Submit"
- Confirmations: "Client saved! What's next?"
- Errors: "Oops! Let's fix that together" with helpful guidance
- Progress: "Almost there!" on multi-step forms

---

## Images

**Profile Photos:**
- Circular avatars: w-12 h-12 (lists), w-16 h-16 (cards), w-24 h-24 (profiles)
- Fallback: Colored circle with initials (professional navy blue palette)
- Upload: Camera/gallery on mobile with crop interface

**No Hero Section:** Application leads with functional dashboard and personalized greeting.