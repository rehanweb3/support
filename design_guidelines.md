# Mintrax AI Support Dashboard - Design Guidelines

## Design Approach
**System-Based Approach**: Modern SaaS dashboard drawing from Linear's clean typography and Notion's information hierarchy, optimized for dark mode with tech/AI aesthetic.

## Core Design Principles
- **Context-Aware Intelligence**: UI adapts to user state, ticket status, and AI availability
- **Seamless Communication**: WhatsApp-style chat creates familiar, comfortable support experience
- **Information Clarity**: Dense data presented with clear hierarchy and visual breathing room
- **Trust & Reliability**: Professional, polished interface that instills confidence in AI support

---

## Color Palette

### Dark Mode (Primary Theme)
- **Background**: 222 84% 5% (deep navy, almost black)
- **Surface/Card**: 222 84% 7% (slightly elevated navy)
- **Primary (Brand)**: 210 100% 55% (vibrant blue)
- **Accent**: 187 85% 53% (cyan/turquoise)
- **Foreground Text**: 210 40% 98% (crisp white)
- **Muted Text**: 215 20% 65% (soft gray)
- **Secondary Surface**: 217 32% 17% (dark blue-gray)
- **Border/Input**: 217 32% 17% (subtle separation)
- **Destructive**: 0 62% 30% (muted red)

### Supporting Colors
- **Chart Colors**: Blue (210 100% 55%), Cyan (187 85% 53%), Yellow (42 92% 56%), Green (147 78% 42%), Pink (341 75% 51%)

---

## Typography

### Font Families
- **Primary**: 'Inter' (Google Fonts) - clean, modern sans-serif for all UI
- **Fallback**: system-ui, -apple-system, sans-serif

### Type Scale
- **Headings**: 600-700 weight, tight letter-spacing
- **Body**: 400 weight, comfortable line-height (1.6)
- **Labels**: 500 weight, uppercase option for emphasis
- **Code/Monospace**: Menlo for technical data (ticket IDs, timestamps)

---

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 4, 6, 8, 12, 16, 20, 24** for consistent rhythm
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-20
- Card gaps: gap-4, gap-6
- Tight elements: space-y-2, space-x-2

### Grid & Structure
- **Dashboard Layout**: Sidebar navigation + main content area
- **Sidebar**: Fixed width (280px), collapsible on mobile
- **Main Content**: max-w-7xl container with responsive padding
- **Chat Interface**: Fixed height container (70vh) with scrollable message area
- **Ticket Cards**: Grid layout - grid-cols-1 md:grid-cols-2 lg:grid-cols-3

### Component Dimensions
- **Border Radius**: 0.75rem (12px) for cards and buttons
- **Shadow Depth**: Layered shadows using primary blue with low opacity (5-25%)
- **Input Height**: h-10 to h-12 for comfortable touch targets

---

## Component Library

### Navigation
- **Sidebar**: Dark glass effect with blur, sticky position, icon + label navigation items
- **Active State**: Primary blue background with full opacity
- **User Profile**: At top of sidebar with avatar, name, status indicator

### Dashboard Cards
- **Ticket Cards**: Surface color (222 84% 7%), rounded corners, subtle border
- **Status Badges**: Color-coded (blue=open, yellow=pending, green=resolved)
- **Hover State**: Slight elevation with shadow-md transition
- **Content**: Icon + title + metadata (date, status) + preview text

### Chat Interface (WhatsApp-Style)
- **Container**: Fixed height with overflow-y-auto, scroll-smooth
- **User Messages**: Align right, primary blue background (210 100% 55%)
- **AI Messages**: Align left, secondary surface (217 32% 17%)
- **Message Bubbles**: Rounded (rounded-2xl), max-width 75%, padding p-3 to p-4
- **Timestamps**: Small muted text below messages
- **Input Area**: Sticky bottom, glass effect background, rounded input with send button
- **Auto-scroll**: Scroll to bottom on new messages

### Ticket Detail View
- **Layout**: Two-column on desktop (ticket info + reply thread)
- **Reply Thread**: Chronological order, differentiate user vs admin with color/alignment
- **Admin Replies**: Highlighted with accent color border or background tint
- **Attachments**: Preview thumbnails with download icons

### Forms & Inputs
- **Input Fields**: Dark background (217 32% 17%), border on focus (primary blue)
- **Text Areas**: Minimum height h-32, auto-expand option
- **Buttons**: 
  - Primary: Gradient blue-to-cyan or solid primary blue
  - Secondary: Transparent with border, white text
  - Destructive: Red background for dangerous actions
- **File Upload**: Drag-and-drop zone with dashed border

### Status Indicators
- **AI Status**: Toggle switch + status text ("Gemini AI: Online/Offline")
- **Offline State**: Red indicator with error message in chat
- **Notifications**: Badge counters on sidebar items (unread tickets, new messages)
- **Loading States**: Subtle pulse animation on primary blue

### Visual Effects
- **Glass Morphism**: `backdrop-filter: blur(10px)` with rgba background
- **Gradients**: Linear gradient 135deg from primary to accent for CTAs and headers
- **Shadows**: Layered shadows with blue tint for depth
- **Animations**: Minimal - pulse for loading, smooth transitions (200-300ms), slide-in for notifications

---

## Images & Media

### Dashboard Imagery
- **User Avatars**: Circle, 40px default, 48px in profile header
- **Empty States**: Illustration placeholders for "No tickets" or "No messages"
- **AI Bot Icon**: Stylized robot/brain icon in accent cyan for AI messages

### No Hero Image
This is a dashboard application - hero sections not applicable. Focus on functional UI density.

---

## Key Interactions

### Real-time Updates
- Toast notifications for new admin replies (slide in from top-right)
- Unread badge updates without page refresh
- Chat message delivery with subtle fade-in

### Error States
- Gemini Offline: Red banner with clear message, disable chat input
- Failed Ticket Submission: Inline error below form with retry button
- Network Issues: Connection status indicator in sidebar

### Responsive Behavior
- **Mobile**: Collapsible sidebar (hamburger menu), single-column ticket grid, full-width chat
- **Tablet**: Two-column ticket grid, persistent sidebar
- **Desktop**: Three-column ticket grid, sidebar + main content, optimal chat width

---

## Accessibility Notes
- Maintain WCAG AA contrast ratios (already achieved with provided colors)
- Keyboard navigation for all interactive elements
- Focus states with primary blue ring
- Screen reader labels for icons and status indicators
- Auto-scroll announcements for new chat messages