# TODO: Replace text logo with theme-aware images

## Task: Replace "StuddyBuddy" text with SB_B/SB_W images

### Changes to make:
- [x] 1. Update `index.html` - Replace text logo with image element (using picture tag)
- [x] 2. Update `src/scss/_navbar.scss` - Add logo image styling
- [x] 3. Build/compile SCSS to CSS

### Notes:
- Uses `<picture>` element with `media="(prefers-color-scheme: light)"` to swap images
- SB_W.png shows on light theme, SB_B.png shows on dark theme
- No CSS filters used - actual image files are swapped

## Completed Changes:
- **index.html**: Uses `<picture>` element to swap between SB_W.png (light theme) and SB_B.png (dark theme)
- **_navbar.scss**: Added `.navbar-logo-img` styling (simple height/width, no filters)
- **main.css**: Compiled successfully

