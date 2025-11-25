# Design Guidelines: Multi-Category Healthcare CRM System

## Design Approach

**Selected Framework:** Ant Design System
**Rationale:** Healthcare data management systems require professional, information-dense interfaces with robust table components, form handling, and dashboard layouts. Ant Design excels at enterprise applications with complex data structures.

**Key Design Principles:**
- Clinical Clarity: Information hierarchy optimized for quick scanning and decision-making
- Professional Trust: Healthcare-appropriate visual language that conveys competence
- Efficiency First: Minimize clicks and cognitive load for busy care staff
- Status Visibility: Clear visual indicators for compliance, urgency, and document states

---

## Core Design Elements

### Typography
- **Primary Font:** Inter or System UI Stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`)
- **Headings:** 
  - Page titles: text-2xl font-semibold
  - Section headers: text-lg font-medium
  - Card headers: text-base font-medium
- **Body Text:** text-sm with text-gray-700 for optimal readability in data-dense views
- **Labels:** text-xs font-medium uppercase tracking-wide text-gray-500
- **Monospace:** For IDs, numbers (NDIS numbers, Medicare): `font-mono text-sm`

### Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Tight spacing (2, 4): Within cards, between form labels and inputs
- Medium spacing (6, 8): Between form sections, card padding
- Large spacing (12, 16): Between major sections, page padding

**Grid Structure:**
- Main content: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Dashboard cards: 3-column grid on desktop (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Data tables: Full-width responsive containers with horizontal scroll on mobile

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header with logo left, main navigation center, user profile/notifications right
- Height: h-16 with shadow-sm
- Category badges: Small pills showing NDIS/Support at Home/Private with distinct colors
- Search bar: Always visible with icon, placeholder "Search clients, NDIS numbers..."

**Sidebar Navigation (Left):**
- Width: w-64 on desktop, collapsible on mobile
- Sections: Dashboard, Clients (with category filters), Documents, Reports, Settings
- Active state: bg-blue-50 with left border-l-4 border-blue-600

### Dashboard Components

**Statistics Cards:**
- Grid layout with key metrics (Total Clients, Compliance Rate, Upcoming Renewals, At-Risk Clients)
- Structure: Icon (top-left) + Large number + Label + Trend indicator
- Padding: p-6, rounded-lg, shadow borders

**Compliance Overview:**
- Timeline-style visualization showing documents due this month
- Color-coded status dots: Green (compliant), Yellow (due soon), Red (overdue)
- Grouped by client category with expandable sections

**Quick Actions Panel:**
- Prominent buttons: "Add New Client", "Upload Document", "Generate Report"
- Secondary actions in dropdown menus

### Client Management

**Client List/Table:**
- Sortable, filterable table with: Photo thumbnail, Name, Category badge, Care Manager, NDIS/ID number, Status indicators
- Inline quick actions: View, Edit, Documents icons
- Pagination: 25 items per page with page size selector
- Category filter tabs above table (All, NDIS, Support at Home, Private)

**Client Profile View:**
- Two-column layout: Left 2/3 for details, Right 1/3 for quick info sidebar
- Profile header: Photo (large), Name, Category badge, key identifiers
- Tabbed sections: Personal Details, NDIS/Program Info, Care Team, Documents, Service History, Financial
- Status indicator ribbons for compliance status

**Document Tracker Grid:**
- Card-based layout showing each document type
- Card content: Document name, Last updated date, Status badge, Due date (if applicable), Upload/View buttons
- Color-coded borders: Green (current), Yellow (due within 30 days), Red (overdue)
- Annual/6-monthly frequency labels

### Forms

**Input Fields:**
- Labels above inputs with required asterisk (*)
- Input height: h-10 with px-3 py-2
- Date pickers: Calendar icon suffix
- File uploads: Drag-and-drop zones with file type indicators
- Multi-select for team members: Checkbox dropdowns with avatars

**Form Layout:**
- Group related fields in cards with subtle backgrounds (bg-gray-50)
- Two-column responsive grid for efficiency (`grid-cols-1 md:grid-cols-2 gap-6`)
- Sticky action bar at bottom: Save, Cancel, Delete (if editing)

### Data Visualization

**Budget/Funding Display:**
- Progress bars showing spent vs. available funding per support category
- Stacked bar charts for multi-category budget overview
- Numeric summaries with large, clear typography

**Timeline Views:**
- Vertical timeline for service delivery history and progress notes
- Date markers on left, content cards on right
- Icon indicators for event types (service, incident, note, review)

### Status & Alert System

**Category Badges:**
- NDIS: blue-600 background
- Support at Home: green-600 background  
- Private: purple-600 background
- Small rounded-full pills with white text, px-3 py-1

**Compliance Status:**
- Icons + text combinations
- Compliant: Check icon, text-green-700
- Due Soon: Clock icon, text-yellow-700
- Overdue: Alert icon, text-red-700

**Alerts/Notifications:**
- Toast notifications top-right for actions (save, upload, etc.)
- In-page alert banners for critical compliance issues
- Badge counts on navigation items for pending items

---

## Images

**Client Profile Photos:**
- Circular avatars: w-12 h-12 in lists, w-24 h-24 in profile headers
- Placeholder: Initials on colored background if no photo
- Upload interface: Drag-drop with preview

**No Hero Section Required:** This is a data management application, not a marketing site. Lead with functional dashboard.

---

## Responsive Behavior

- **Desktop (lg+):** Full sidebar, multi-column layouts, expanded tables
- **Tablet (md):** Collapsible sidebar, 2-column grids, horizontal scroll tables
- **Mobile (base):** Bottom navigation, single-column stacked layouts, simplified tables with essential columns

---

## Accessibility

- WCAG AA compliant color contrasts for all text and status indicators
- Keyboard navigation for all interactive elements with visible focus states (ring-2 ring-blue-500)
- Screen reader labels for icon-only buttons
- Form validation with clear error messages below inputs