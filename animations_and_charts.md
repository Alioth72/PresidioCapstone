# Code Explanation: Animations & Charts Implementation

This document provides a line-by-line and architectural breakdown of how **Animations** and **Data Charts** are implemented in the Bibliotech application.

---

## 1. Animations Implementation

All animations in the application are implemented using a combination of **Vanilla CSS Transitions**, **Keyframe Animations**, and **React State Transitions**. No external heavy animation libraries (like Framer Motion) are used, which keeps the bundle size small and performance extremely fast.

### A. Neo-Brutalist Tactile Hover & Active States
Neo-brutalism relies on bold borders and offset shadows. To make the UI feel alive, we animate cards and buttons when users hover over or click them.

#### CSS Definition (`frontend/src/index.css`)
```css
/* Brutalist Cards */
.brut-card {
  background-color: var(--card-bg);
  border: var(--border-width) solid var(--border-color);
  box-shadow: var(--shadow-offset) var(--shadow-offset) 0px var(--border-color);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.brut-card.interactive:hover {
  transform: translate(-2px, -2px);
  box-shadow: calc(var(--shadow-offset) + 2px) calc(var(--shadow-offset) + 2px) 0px var(--border-color);
}

.brut-card.interactive:active {
  transform: translate(var(--shadow-offset), var(--shadow-offset));
  box-shadow: 0px 0px 0px var(--border-color);
}
```

#### How it works:
1. **`transition: transform 0.15s ease, box-shadow 0.15s ease;`** (Line 82): Tells the browser to smoothly interpolate changes to the card's position (`transform`) and shadow (`box-shadow`) over 150 milliseconds.
2. **`transform: translate(-2px, -2px);`** (Line 86): On hover, shifts the card up and left by `2px`.
3. **`box-shadow: calc(var(--shadow-offset) + 2px)...`** (Line 87): Increases the shadow depth by `2px` in the opposite direction. Combined with the shift, this creates a 3D "rising" effect where the card appears to lift off the page.
4. **`transform: translate(var(--shadow-offset), var(--shadow-offset));`** (Line 91): When clicked (`:active`), shifts the card down and right by the exact shadow offset (usually `4px`).
5. **`box-shadow: 0px 0px 0px var(--border-color);`** (Line 92): Shrinks the shadow to `0px`. This makes it look like the card is being physically pressed flat into the page.

---

### B. Global Toast Notification pop-up
When a toast message (success, error, or info) is triggered, it slides up dynamically from the bottom-right corner of the screen.

#### CSS Definition (`frontend/src/index.css`)
```css
.brut-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  border: var(--border-width) solid var(--border-color);
  box-shadow: 6px 6px 0px var(--border-color);
  padding: 1rem 1.5rem;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-heading);
  font-weight: 600;
  animation: slideUp 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from {
    transform: translateY(100%) translateY(2rem);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

#### How it works:
1. **`animation: slideUp 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);`** (Line 213): Runs the `slideUp` animation for 200ms when the element enters the DOM. 
2. **`cubic-bezier(0.175, 0.885, 0.32, 1.275)`** is a custom timing function representing an **elastic back-out curve**. It causes the toast to slide up slightly past its destination and then bounce back into place, giving a playful, tactile bounce.
3. **`@keyframes slideUp`** (Line 216):
   - **`from`** (Line 217): The toast begins completely off-screen (`translateY(100%)` plus an extra safety margin of `2rem`) and fully transparent (`opacity: 0`).
   - **`to`** (Line 221): The toast arrives at its default position (`translateY(0)`) and becomes fully visible (`opacity: 1`).

---

### C. Theme Transition (Light/Dark Mode)
To avoid a jarring flash or instant change when toggling dark mode, a transition is applied globally.

#### CSS Definition (`frontend/src/index.css`)
```css
/* Ensure smooth transitions when switching themes */
body, .brut-card, .brut-btn, .brut-input, navbar, header, footer, div, section, button, input, select, textarea {
  transition: background-color 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
```

#### How it works:
- When the `[data-theme="dark"]` attribute is toggled on `document.documentElement`, the root variables change (e.g., `--bg-color` moves from `#F4F0EA` to `#07070A`).
- The transition causes the background color, text color, border color, and shadow of almost all major containers on the page to fade smoothly over 250 milliseconds (`0.25s ease`) instead of instantly snapping.

---

### D. AI Chat Assistant Drawer Slide-Out
The AI assistant resides in a floating panel that slides in from the right edge of the viewport.

#### JS Inline Style Definition (`frontend/src/components/ChatAssistant.tsx`)
```typescript
{
  position: 'fixed',
  top: 0,
  right: isOpen ? 0 : '-420px',
  width: '400px',
  maxWidth: '100%',
  height: '100vh',
  backgroundColor: 'var(--bg-color)',
  borderLeft: 'var(--border-width) solid var(--border-color)',
  boxShadow: '-10px 0px 0px rgba(0, 0, 0, 0.1)',
  zIndex: 500,
  transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  display: 'flex',
  flexDirection: 'column'
}
```

#### How it works:
1. **`right: isOpen ? 0 : '-420px'`** (Line 150): If the chat is open, its right boundary is flush with the screen edge (`0`). If closed, it is positioned `-420px` (its width plus borders/shadows) off-screen to the right.
2. **`transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)'`** (Line 158): This is an **Ease-Out Quint** curve. It starts the sliding transition extremely quickly and decelrates smoothly, making the slide-in drawer feel premium and highly responsive.
3. **`backdropFilter: 'blur(2px)'`** (Line 329): Added on the background overlay to blur content behind the active drawer, highlighting the focus on the chat thread.

---

### E. Loading Spinners
Used during API data fetches or initial page loading.

#### HTML/CSS Definition (`frontend/src/pages/CatalogPage.tsx` & `frontend/src/App.tsx`)
```typescript
<div style={{
  display: 'inline-block',
  width: '50px',
  height: '50px',
  border: '5px solid var(--primary)',
  borderTopColor: 'transparent',
  animation: 'spin 1s linear infinite',
  boxShadow: '2px 2px 0px var(--border-color)'
}} />
```
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

#### How it works:
- **`border: '5px solid var(--primary)'`**: Draws a square border around the div.
- **`borderTopColor: 'transparent'`**: Hides the top border line, turning the square border into a three-sided arc.
- **`animation: 'spin 1s linear infinite'`**: Rotates the three-sided arc `360 degrees` continuously over a `1s` interval at a constant (`linear`) speed. This yields a rotating circle loading effect.

---

## 2. Charts Implementation

Charts are rendered on the **System Analytics** tab for administrators to visualize database trends.

### A. Library Setup
We use **`chart.js`** as the rendering engine and **`react-chartjs-2`** as a wrapper. Since Chart.js uses tree-shaking, we register necessary modules in `frontend/src/pages/DashboardPage.tsx`:

```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);
```
- **`CategoryScale`**: Allows the X-axis of the Bar chart to display text categories.
- **`LinearScale`**: Computes numerical values on the Y-axis.
- **`BarElement`**: Renders the vertical blocks on the Bar chart.
- **`ArcElement`**: Renders the circular wedges of the Doughnut chart.
- **`Tooltip` & `Legend`**: Adds hover cards and visual labeling.

---

### B. Chart 1: Borrows By Category (Bar Chart)
Shows how many books have been borrowed within each category to highlight reader interest.

```typescript
// 1. Data Aggregation
const categoryCounts: Record<string, number> = {};
loans.forEach((l) => {
  const cat = l.book_category || 'Uncategorized';
  categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
});

// 2. ChartJS Dataset Mapping
const barChartData = {
  labels: Object.keys(categoryCounts), // e.g. ["Fiction", "Science", "Technology"]
  datasets: [
    {
      label: 'Number of Borrows',
      data: Object.values(categoryCounts), // e.g. [12, 4, 9]
      backgroundColor: '#FDE047', // Neo-Brutalist primary yellow
      borderColor: textColor,
      borderWidth: 2,
      borderRadius: 0, // Solid square blocks (Neo-Brutalist aesthetic)
    },
  ],
};
```

#### Configuration Options (Axes & Themes):
```typescript
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: textColor, // Switches color dynamically depending on Light/Dark mode
        font: { family: 'Lexend, sans-serif', weight: 800, size: 12 },
      },
    },
  },
  scales: {
    x: {
      grid: { color: gridColor },
      ticks: { color: textColor, font: { family: 'Lexend, sans-serif', weight: 700 } },
    },
    y: {
      grid: { color: gridColor },
      ticks: { color: textColor, font: { family: 'Lexend, sans-serif', weight: 700 }, stepSize: 1 },
    },
  },
};
```

#### How it works:
1. **Dynamic Theme Sync**:
   - `textColor` is set to `#F3F4F6` (dark mode) or `#000000` (light mode).
   - `gridColor` is set to light white lines (`rgba(243, 244, 246, 0.15)`) or dark grey lines (`rgba(0, 0, 0, 0.15)`).
   - These variables update immediately on state refresh when the administrator toggles the theme, forcing Chart.js to repaint with the appropriate colors.
2. **`stepSize: 1`**: Prevents Chart.js from displaying decimal values (like "1.5 books borrowed") on the Y-axis.

---

### C. Chart 2: Loan Status Distribution (Doughnut Chart)
Provides a visual breakdown of active, overdue, and returned checkouts.

```typescript
// 1. Data Aggregation
const activeCount = loans.filter((l) => l.is_active && !l.is_overdue).length;
const overdueCount = loans.filter((l) => l.is_active && l.is_overdue).length;
const returnedCount = loans.filter((l) => !l.is_active).length;

// 2. ChartJS Dataset Mapping
const doughnutChartData = {
  labels: ['Active Loans', 'Overdue Loans', 'Returned Loans'],
  datasets: [
    {
      data: [activeCount, overdueCount, returnedCount],
      backgroundColor: [
        '#FACC15', // Canary Yellow (Active)
        '#F87171', // Soft Red (Overdue)
        '#A78BFA', // Purple (Returned)
      ],
      borderColor: textColor,
      borderWidth: 2,
    },
  ],
};
```

#### Configuration Options:
```typescript
const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: textColor,
        font: { family: 'Lexend, sans-serif', weight: 800, size: 12 },
      },
    },
  },
};
```

#### How it works:
- Renders three colored sectors indicating loan states.
- The colors match the styling tokens of our theme (`--primary`, `--accent`, etc.), maintaining the Neo-Brutalist dashboard aesthetic.
- The wrapper `react-chartjs-2` handles cleanup automatically when the component unmounts, preventing memory leaks related to canvas drawing contexts.
