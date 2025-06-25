# DataSource Dialog Space Optimization Complete

## Changes Implemented

### 1. **Moved Name & Description to Connection Tab**
- ✅ Removed dedicated header section
- ✅ Added name and description fields to ConnectionConfigForm
- ✅ Dialog title now shows: "Edit Data Source - [name]" when name is entered
- ✅ Used 2-column layout for compact display

### 2. **Tab Strip is Now Topmost Element**
- ✅ Removed all content above tabs
- ✅ Tabs start immediately below dialog header
- ✅ Reduced tab height and padding
- ✅ No more wasted vertical space at top

### 3. **Key Column Moved to Connection Tab**
- ✅ Removed from Fields & Columns tab (was redundant)
- ✅ Added to Connection tab in 2-column layout
- ✅ Shows dropdown when fields are inferred, text input otherwise
- ✅ Placed next to Provider Type for logical grouping

### 4. **Connection Tab Optimizations**
- ✅ 2-column layout for most fields:
  - Row 1: Name | Description
  - Row 2: Provider Type | Key Column  
  - Row 3: Data Type | Update Rate
  - Row 4: Batch Size | Trigger Format
  - Row 5: Listener Topic | Trigger Destination
- ✅ Full width for URL field
- ✅ Reduced all input heights to 7px
- ✅ Smaller labels (text-xs)

### 5. **Fields & Columns Tab Improvements**
- ✅ Removed key column section completely
- ✅ Re-infer button moved to top of fields list
- ✅ Reduced padding throughout (p-3 → p-2)
- ✅ Smaller controls and text
- ✅ More compact column list

### 6. **Overall Space Savings**
- Dialog height: 650px → 600px
- Removed ~100px from header section
- Removed ~80px from key column section
- Gained ~180px of usable vertical space
- All controls more compact but still usable

## Before vs After

**Before:**
- Header with name/description: ~80px
- Tab strip: ~40px  
- Key column section: ~100px
- Usable content area: ~430px

**After:**
- Tab strip only: ~35px
- Usable content area: ~565px
- **Net gain: ~135px more content space**

## Technical Details

### Layout Structure
```
Dialog (600px height)
├── Dialog Header (with dynamic title)
├── Tab Strip (35px, fixed)
└── Tab Content (flex-1, scrollable)
    ├── Connection Tab
    │   └── 2-column form layout
    └── Fields & Columns Tab
        └── 3-column selector layout
```

### Key CSS Changes
- Input heights: `h-8` → `h-7` 
- Button heights: `h-8` → `h-6`
- Text sizes: `text-sm` → `text-xs`
- Labels: `text-sm` → `text-xs`
- Padding: `p-4` → `p-3` → `p-2`
- Gaps: `gap-4` → `gap-3` → `gap-2`

The dialog now maximizes vertical space for actual content while maintaining a clean, professional appearance.