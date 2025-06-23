# DataTable Dialog Mockups & Design System

## Design System Foundation

### Color Palette
```scss
// Core Colors
--background: hsl(0 0% 100%);          // #FFFFFF
--foreground: hsl(222.2 84% 4.9%);     // #0A0A0F
--muted: hsl(210 40% 96.1%);           // #F1F5F9
--muted-foreground: hsl(215.4 16.3% 46.9%); // #64748B
--border: hsl(214.3 31.8% 91.4%);      // #E2E8F0
--primary: hsl(221.2 83.2% 53.3%);     // #4F46E5
--primary-foreground: hsl(210 40% 98%); // #FAFBFC
--secondary: hsl(210 40% 96.1%);        // #F1F5F9
--accent: hsl(210 40% 96.1%);           // #F1F5F9
--destructive: hsl(0 84.2% 60.2%);      // #F43F5E
--success: hsl(142.1 76.2% 36.3%);      // #16A34A
--warning: hsl(38 92% 50%);             // #F59E0B

// Dark Mode
--background-dark: hsl(222.2 84% 4.9%);  // #0A0A0F
--foreground-dark: hsl(210 40% 98%);     // #FAFBFC
```

### Typography
```scss
// Font Family
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;

// Font Sizes
--text-xs: 11px;
--text-sm: 12px;
--text-base: 13px;
--text-lg: 14px;
--text-xl: 16px;
--text-2xl: 20px;

// Font Weights
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

// Line Heights
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Spacing
```scss
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Component Specifications

#### Base Dialog
```scss
.dialog {
  border-radius: 8px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border);
  background: var(--background);
  overflow: hidden;
}

.dialog-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}
```

#### Dialog Header
```scss
.dialog-header {
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--muted);
}
```

#### Buttons
```scss
// Sizes
.btn-sm { height: 28px; padding: 0 12px; font-size: 12px; }
.btn-md { height: 32px; padding: 0 16px; font-size: 13px; }
.btn-lg { height: 36px; padding: 0 20px; font-size: 14px; }

// Variants
.btn-primary { 
  background: var(--primary); 
  color: var(--primary-foreground);
}
.btn-secondary { 
  background: var(--secondary); 
  color: var(--foreground);
}
.btn-ghost { 
  background: transparent; 
  color: var(--foreground);
}
.btn-destructive { 
  background: var(--destructive); 
  color: white;
}
```

---

## 1. Column Formatting Dialog

### Specifications
- **Size**: 900px × 650px
- **Position**: Centered, draggable
- **Tabs**: Styling, Format, General, Filter, Editor

### Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ≡  Column Formatting                                              [−][□][×] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┬────────────────────────────────────────────────────────┐│
│ │ COLUMNS         │  [Styling] [Format] [General] [Filter] [Editor]         ││
│ │                 ├────────────────────────────────────────────────────────┤│
│ │ □ Select All    │                                                         ││
│ │                 │  CELL STYLING                                           ││
│ │ ☑ Product Name  │  ┌─────────────────────────────────────────────────┐   ││
│ │ ☑ Price         │  │ Text Color    [#000000] [🎨]                   │   ││
│ │ □ Quantity      │  │ Background    [#FFFFFF] [🎨]                   │   ││
│ │ □ Status        │  └─────────────────────────────────────────────────┘   ││
│ │ □ Date Added    │                                                         ││
│ │ □ Category      │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ Font          [Default ▼] Size [13px ▼]        │   ││
│ │ [Search...]     │  │ Weight        [Normal ▼]  Style [Normal ▼]     │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ │                 │                                                         ││
│ │ 2 selected      │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ Borders                                         │   ││
│ │                 │  │ Top    [─────] [1px] [#E2E8F0] [🎨]            │   ││
│ │                 │  │ Right  [─────] [1px] [#E2E8F0] [🎨]            │   ││
│ │                 │  │ Bottom [─────] [1px] [#E2E8F0] [🎨]            │   ││
│ │                 │  │ Left   [─────] [1px] [#E2E8F0] [🎨]            │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ │                 │                                                         ││
│ │                 │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ Padding & Alignment                             │   ││
│ │                 │  │ Padding  [8px] [→] [8px] [↓] [8px] [←] [8px]  │   ││
│ │                 │  │ H-Align  [◀ ■ ▶]  V-Align [▲ ■ ▼]            │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ │                 │                                                         ││
│ │                 │  PREVIEW                                                ││
│ │                 │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ Product Name │ Price                            │   ││
│ │                 │  ├──────────────┼──────────────────────────────────┤   ││
│ │                 │  │ Widget Pro   │ $99.99                           │   ││
│ │                 │  │ Gadget Plus  │ $149.99                          │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ └─────────────────┴────────────────────────────────────────────────────────┤│
│                                                   [Cancel] [Apply] [Apply All]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Format Tab
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ≡  Column Formatting                                              [−][□][×] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┬────────────────────────────────────────────────────────┐│
│ │ COLUMNS         │  [Styling] [Format] [General] [Filter] [Editor]         ││
│ │                 ├────────────────────────────────────────────────────────┤│
│ │ ☑ Price         │  FORMAT TEMPLATE                                        ││
│ │ ☑ Cost          │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ Template     [Currency         ▼]              │   ││
│ │                 │  │                                                 │   ││
│ │                 │  │ ○ Number      ○ Phone        ○ Status          │   ││
│ │                 │  │ ● Currency    ○ Email        ○ Progress        │   ││
│ │                 │  │ ○ Percentage  ○ Boolean      ○ Rating          │   ││
│ │                 │  │ ○ Date/Time   ○ Traffic Light                  │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ │                 │                                                         ││
│ │                 │  CURRENCY OPTIONS                                       ││
│ │                 │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ Symbol       [$        ▼]  Position [Before ▼] │   ││
│ │                 │  │ Decimals     [2    ↕]      Separator [✓]       │   ││
│ │                 │  │ Negative     [Red with () ▼]                   │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ │                 │                                                         ││
│ │                 │  EXCEL FORMAT STRING                                    ││
│ │                 │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ $#,##0.00;[Red]($#,##0.00)                     │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ │                 │                                                         ││
│ │                 │  PREVIEW                                                ││
│ │                 │  ┌─────────────────────────────────────────────────┐   ││
│ │                 │  │ Input Value  │ Formatted Output                 │   ││
│ │                 │  ├──────────────┼──────────────────────────────────┤   ││
│ │                 │  │ 1234.5       │ $1,234.50                        │   ││
│ │                 │  │ -500         │ ($500.00)  [shown in red]        │   ││
│ │                 │  │ 0            │ $0.00                            │   ││
│ │                 │  └─────────────────────────────────────────────────┘   ││
│ └─────────────────┴────────────────────────────────────────────────────────┤│
│                                                   [Cancel] [Apply] [Apply All]│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Source Configuration Dialog

### Specifications
- **Size**: 800px × 600px
- **Position**: Centered, draggable
- **Tabs**: Based on selected source type

### Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ≡  Data Source Configuration                                      [−][□][×] │
├─────────────────────────────────────────────────────────────────────────────┤
│  Name: [My Data Source                    ]                                 │
│  Type: [WebSocket (STOMP)                ▼]                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Connection] [Fields] [Columns] [Statistics]                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  CONNECTION SETTINGS                                                        │
│                                                                             │
│  WebSocket URL *                                                            │
│  [ws://localhost:8080/websocket                                         ]   │
│                                                                             │
│  Listener Topic *                                                           │
│  [/topic/data-updates                                                   ]   │
│                                                                             │
│  ┌─────────────────────────────────┬────────────────────────────────────┐  │
│  │ Request Message                  │ Snapshot End Token                 │  │
│  │ [START                       ]   │ [END_OF_SNAPSHOT              ]   │  │
│  └─────────────────────────────────┴────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────┬────────────────────────────────────┐  │
│  │ Key Column                      │ Message Rate (msg/s)               │  │
│  │ [id                          ]   │ [1000                         ]   │  │
│  └─────────────────────────────────┴────────────────────────────────────┘  │
│                                                                             │
│  □ Auto-start on application load                                           │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ [🔌 Test Connection]  Connection Status: ● Connected                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  PREVIEW DATA                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ id  │ name           │ price  │ quantity │ status    │ updated      │  │
│  ├─────┼────────────────┼────────┼──────────┼───────────┼──────────────┤  │
│  │ 1   │ Product Alpha  │ 99.99  │ 150      │ active    │ 2024-01-15   │  │
│  │ 2   │ Product Beta   │ 149.99 │ 75       │ active    │ 2024-01-15   │  │
│  │ 3   │ Product Gamma  │ 199.99 │ 0        │ inactive  │ 2024-01-14   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                      [Cancel] [Save & Close] │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fields Tab
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ≡  Data Source Configuration                                      [−][□][×] │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Connection] [Fields] [Columns] [Statistics]                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────┬────────────────────────────────────┐│
│  │ AVAILABLE FIELDS                   │ SELECTED FIELDS (6)                ││
│  │                                    │                                    ││
│  │ [🔍 Search fields...]              │ ┌────────────────────────────────┐ ││
│  │                                    │ │ ☑ id (number)                  │ ││
│  │ □ Select All           [📊 Infer] │ │ ☑ name (string)                │ ││
│  │                                    │ │ ☑ price (number)               │ ││
│  │ ▼ □ Root (6 fields)               │ │ ☑ quantity (number)            │ ││
│  │   ☑ id             number         │ │ ☑ status (string)              │ ││
│  │   ☑ name           string         │ │ ☑ updated (date)               │ ││
│  │   ☑ price          number         │ └────────────────────────────────┘ ││
│  │   ☑ quantity       number         │                                    ││
│  │   ☑ status         string         │ Field Details                      ││
│  │   ☑ updated        date           │ ┌────────────────────────────────┐ ││
│  │   ▶ □ metadata     object         │ │ Field: price                   │ ││
│  │   □ tags           array          │ │ Type:  number                  │ ││
│  │                                    │ │ Path:  $.price                 │ ││
│  │                                    │ │ Sample: 99.99                  │ ││
│  │                                    │ │ Nullable: false                │ ││
│  │                                    │ └────────────────────────────────┘ ││
│  └────────────────────────────────────┴────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                      [Cancel] [Save & Close] │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Grid Options Editor

### Specifications
- **Size**: 600px × 500px
- **Position**: Centered, modal
- **Categories**: Display, Interaction, Performance, Export

### Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Grid Settings                                                     [−][□][×] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────┬───────────────────────────────────────────────────────┐ │
│ │ CATEGORIES     │ DISPLAY SETTINGS                                      │ │
│ │                │                                                       │ │
│ │ ▶ Display      │ Theme                                                 │ │
│ │   • General    │ ○ Light  ● Dark  ○ Auto (System)                     │ │
│ │   • Appearance │                                                       │ │
│ │   • Typography │ Density                                               │ │
│ │                │ ○ Compact  ● Normal  ○ Comfortable                   │ │
│ │ ▶ Interaction  │                                                       │ │
│ │ ▶ Performance  │ ┌───────────────────────────────────────────────────┐ │ │
│ │ ▶ Export       │ │ Row Height         32 px [═══════│═══] 20-60     │ │ │
│ │                │ │ Header Height      40 px [═════════│═] 30-80     │ │ │
│ │                │ │ Font Size          13 px [═══════│═══] 10-20     │ │ │
│ │                │ └───────────────────────────────────────────────────┘ │ │
│ │                │                                                       │ │
│ │                │ ☑ Show Row Numbers                                    │ │
│ │                │ ☑ Alternating Row Colors                             │ │
│ │                │ ☑ Show Grid Lines                                     │ │
│ │                │                                                       │ │
│ │                │ Grid Lines                                            │ │
│ │                │ ○ None  ○ Horizontal  ○ Vertical  ● Both            │ │
│ │                │                                                       │ │
│ │                │ PREVIEW                                               │ │
│ │                │ ┌───────────────────────────────────────────────────┐ │ │
│ │                │ │ # │ Column A    │ Column B    │ Column C         │ │ │
│ │                │ ├───┼─────────────┼─────────────┼──────────────────┤ │ │
│ │                │ │ 1 │ Sample Data │ Value 123   │ Active           │ │ │
│ │                │ │ 2 │ Test Row    │ Value 456   │ Inactive         │ │ │
│ │                │ └───────────────────────────────────────────────────┘ │ │
│ └────────────────┴───────────────────────────────────────────────────────┘ │
│                                              [Reset] [Cancel] [Apply]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Compact Floating Ribbon

### Specifications
- **Size**: 320px × auto (collapsible)
- **Position**: Floating, draggable
- **Always on top**: Yes

### Mockup

```
┌─────────────────────────────────────────────────────────┐
│ ≡ Quick Format                                  [−][×] │
├─────────────────────────────────────────────────────────┤
│ Column: [Price                             ▼]           │
├─────────────────────────────────────────────────────────┤
│ QUICK STYLES                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [B] [I] [U]  Color [■] BG [□]  [◀|■|▶]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ FORMAT TEMPLATE                                         │
│ [Currency                                  ▼]           │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Symbol [$▼] Decimals [2↕] □ Thousands              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ PREVIEW                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1234.5 → $1,234.50                                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                        [Apply] [Apply to All]           │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Profile Management Dialog

### Specifications
- **Size**: 500px × 400px
- **Position**: Centered, modal
- **Features**: List, create, edit, delete, import/export

### Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Profile Management                                                    [×]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ [+ New Profile] [📥 Import] [📤 Export]                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ ● Default Profile                                          [📝] [🗑️]  │   │
│ │   Created: Jan 15, 2024 | Updated: Today                              │   │
│ ├───────────────────────────────────────────────────────────────────────┤   │
│ │ ○ Sales Dashboard                                          [📝] [🗑️]  │   │
│ │   Custom view for sales team with KPI columns                         │   │
│ │   Created: Jan 10, 2024 | Updated: Jan 12, 2024                       │   │
│ ├───────────────────────────────────────────────────────────────────────┤   │
│ │ ○ Financial Report                                    [🔒] [📝] [🗑️]  │   │
│ │   Protected profile for quarterly reports                             │   │
│ │   Created: Dec 1, 2023 | Updated: Dec 15, 2023                        │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ PROFILE DETAILS                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Name: Default Profile                                                 │   │
│ │ Components: 1 DataTable                                               │   │
│ │ Columns: 12 configured                                                │   │
│ │ Data Source: WebSocket - Live Trading Data                            │   │
│ │ Last Modified: 2 hours ago                                            │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                          [Set as Default] [Close]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Column Template Manager

### Specifications
- **Size**: 600px × 450px
- **Position**: Centered, modal
- **Features**: Template library, preview, apply

### Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Column Template Manager                                               [×]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ [+ Create Template] [📥 Import] [📤 Export]                    Search: [🔍] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────┬──────────────────────────────────────────────┐  │
│ │ TEMPLATES              │ TEMPLATE PREVIEW                             │  │
│ │                        │                                              │  │
│ │ 📊 Financial           │ Name: Financial Currency                    │  │
│ │ ├─ Currency Display    │ Type: Number → Currency                     │  │
│ │ ├─ Percentage KPI      │                                              │  │
│ │ └─ Profit/Loss         │ Settings:                                    │  │
│ │                        │ • Symbol: $                                  │  │
│ │ 🎨 Status Indicators   │ • Position: Before                           │  │
│ │ ├─ Traffic Lights      │ • Decimals: 2                                │  │
│ │ ├─ Progress Bars       │ • Thousands: Yes                             │  │
│ │ └─ Badges              │ • Negative: Red with parentheses             │  │
│ │                        │                                              │  │
│ │ 📅 Date & Time         │ Preview:                                     │  │
│ │ ├─ Short Date          │ ┌────────────────────────────────────────┐  │  │
│ │ ├─ Long Date           │ │ Input     │ Output                     │  │  │
│ │ └─ Relative Time       │ ├───────────┼────────────────────────────┤  │  │
│ │                        │ │ 1234.56   │ $1,234.56                  │  │  │
│ │ 🔤 Text Formatting     │ │ -500      │ ($500.00) [red]            │  │  │
│ │ ├─ Title Case          │ │ 0         │ $0.00                      │  │  │
│ │ └─ Truncate            │ └────────────────────────────────────────┘  │  │
│ └────────────────────────┴──────────────────────────────────────────────┘  │
│                                                                             │
│                                    [Cancel] [Apply to Selected Columns]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Design Patterns & Best Practices

### 1. Consistent Dialog Structure
- Header with drag handle and window controls
- Clear visual hierarchy with sections
- Footer with action buttons (right-aligned)
- Primary action on the right, secondary on the left

### 2. Tab Navigation
- Horizontal tabs for main sections
- Vertical tabs for categories (settings)
- Badge indicators for counts/changes
- Clear active state indication

### 3. Form Design
- Labels above inputs
- Grouped related fields
- Clear required field indicators (*)
- Inline validation messages
- Helpful placeholder text

### 4. Interactive Elements
- Hover states for all clickable elements
- Loading states with spinners
- Disabled states with reduced opacity
- Focus indicators for keyboard navigation
- Tooltips for complex controls

### 5. Color Usage
- Primary color for main actions
- Destructive color for delete/remove
- Muted backgrounds for sections
- Success/warning colors for status
- Consistent border colors

### 6. Spacing & Alignment
- 8px grid system
- Consistent padding (16px for dialogs)
- Aligned form fields
- Proper visual grouping
- Breathing room between sections

### 7. Typography
- Clear hierarchy (headers, labels, values)
- Consistent font sizes
- Proper contrast ratios
- Monospace for code/data

### 8. Responsive Behavior
- Minimum sizes enforced
- Scrollable content areas
- Collapsible sections where appropriate
- Draggable with boundary constraints

### 9. Accessibility
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- High contrast support
- Screen reader friendly

### 10. Dark Mode Support
- All colors have dark mode variants
- Proper contrast maintained
- Borders adjusted for visibility
- Icons remain visible

---

## Implementation Notes

1. **Use existing shadcn/ui components** as the foundation
2. **Maintain consistent spacing** using the 8px grid
3. **All dialogs should be draggable** with the header as handle
4. **Implement proper focus management** for accessibility
5. **Use CSS variables** for theming support
6. **Memoize expensive operations** in preview panels
7. **Debounce live previews** to avoid performance issues
8. **Save dialog positions** in user preferences
9. **Support keyboard shortcuts** for power users
10. **Implement proper error boundaries** for each dialog

This design system ensures consistency across all DataTable dialogs while maintaining the sophisticated, data-focused aesthetic of the application. The mockups provide clear visual guidance for implementation while allowing flexibility for specific use cases.