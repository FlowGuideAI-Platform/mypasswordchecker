# Open Graph Image

## Current Status
An SVG placeholder (`og-image.svg`) has been created at 1200x630px (optimal for social sharing).

## To Create PNG Version
Social media platforms prefer PNG/JPG over SVG for Open Graph images.

### Option 1: Convert SVG to PNG locally
```bash
# Using ImageMagick (if installed)
convert og-image.svg -resize 1200x630 og-image.png

# Using Inkscape (if installed)
inkscape og-image.svg --export-png=og-image.png --export-width=1200 --export-height=630

# Using online converter
# Upload og-image.svg to https://cloudconvert.com/svg-to-png
```

### Option 2: Create custom image in design tool
Use Canva, Figma, or Photoshop to create a 1200x630px image with:
- Blue gradient background (#3b82f6 → #2563eb → #1d4ed8)
- 🔐 Lock emoji or icon
- "MyPasswordChecker.com" title
- "Password Strength & Quantum Resistance" subtitle
- Feature highlights

### Option 3: Keep SVG (temporary)
SVG works in many contexts but PNG is more universally supported by social platforms.

## Specifications
- **Dimensions:** 1200x630px (1.91:1 aspect ratio)
- **Format:** PNG or JPG
- **File size:** Under 8MB (ideally under 300KB)
- **Content:** Should include branding, value proposition, and be readable when scaled down

## Current Design
- Blue gradient background matching site theme
- Lock icon (🔐)
- Site name and tagline
- Feature badges
- "Client-Side Processing" privacy highlight
