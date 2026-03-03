# TODO - StuddyBuddy Feature Implementation

## Task 1: Cloud Migration for World Clock & Countdowns
- [x] 1.1 Refactor src/js/worldclock.js to use Network-First strategy
- [x] 1.2 Refactor src/js/countdown.js to use Network-First strategy
- [x] 1.3 Update backend models to include userId field
- [x] 1.4 Test offline fallback to IndexedDB/localStorage

## Task 2: Persistent Study Statistics
- [x] 2.1 Create backend/models/StudySession.js model
- [x] 2.2 Create backend/routes/studySessions.js API routes
- [x] 2.3 Register new route in backend/server.js
- [x] 2.4 Update src/js/study-stats.js to sync with backend
- [x] 2.5 Add offline sync support via pendingSync queue

## Task 3: PWA Browser Fallbacks (Manual Sync Queue)
- [x] 3.1 Verify window 'online' listener in sync.js triggers runFullSync()
- [x] 3.2 Add additional retry logic if needed

## Task 4: Virtual Companion "Muffin" Interaction Logic
- [x] 4.1 Add #muffin-container HTML to index.html (inside pomodoro card)
- [x] 4.2 Add Muffin SVG/CSS to main.scss
- [x] 4.3 Update src/js/pomodoro.js to manage Muffin states

## Task 5: Smooth Theme Transitions
- [x] 5.1 Verify CSS transitions in main.scss for body and .card
- [x] 5.2 Ensure prefers-reduced-motion disables transitions for accessibility

