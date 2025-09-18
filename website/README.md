# CleanCue Website

Professional landing page for CleanCue DJ library management software.

## 🌐 Website Structure

```
website/
├── index.html          # Main landing page
├── css/
│   └── main.css       # Styles and responsive design
├── js/
│   └── main.js        # Interactive functionality
├── assets/
│   ├── favicon.ico    # Site icon
│   └── images/        # Screenshots and graphics
└── README.md          # This file
```

## ✨ Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Professional Styling** - Clean, modern DJ-focused design
- **Performance Optimized** - Fast loading, smooth animations
- **SEO Ready** - Meta tags, structured data, social sharing
- **Accessibility** - Keyboard navigation, focus states, semantic HTML
- **Analytics Ready** - Download tracking, user engagement metrics

## 🎯 Key Sections

1. **Hero** - "DJ Library Freedom" messaging with download CTAs
2. **Problem** - Addresses DJ software vendor lock-in pain points
3. **Features** - Showcases CleanCue's capabilities
4. **Downloads** - Platform-specific download buttons
5. **Use Cases** - Perfect for festival, mobile, radio, club DJs
6. **About** - CmndrCody's story and mission
7. **Footer** - Links to GitHub, social media, documentation

## 🚀 Hosting Options

### Option 1: GitHub Pages (Free)
```bash
# Create gh-pages branch
git checkout -b gh-pages
git add website/*
git commit -m "Add CleanCue website"
git push origin gh-pages
```

### Option 2: Netlify (Free)
1. Connect GitHub repository
2. Build command: (none needed)
3. Publish directory: `website/`
4. Custom domain: `cmdrcody.com`

### Option 3: Vercel (Free)
1. Import GitHub repository
2. Framework preset: Other
3. Root directory: `website/`
4. Custom domain: `cmdrcody.com`

### Option 4: Traditional Hosting
Upload `website/` contents to your web server's public directory.

## 🎨 Customization

### Colors (CSS Variables)
- Primary: `#6366f1` (Indigo)
- Secondary: `#8b5cf6` (Purple)
- Accent: `#06b6d4` (Cyan)

### Typography
- Font: Inter (Google Fonts)
- Headings: 600 weight
- Body: 400 weight

### Animations
- Fade-in on scroll
- Hover effects on cards
- Smooth scrolling navigation

## 📱 Responsive Breakpoints

- Desktop: 1200px+
- Tablet: 768px - 1199px
- Mobile: 480px - 767px
- Small Mobile: < 480px

## 🔧 Development

### Local Development
```bash
# Simple HTTP server
python -m http.server 8000
# Or use any static file server

# View at http://localhost:8000
```

### Build Process
No build process required - static HTML/CSS/JS files ready for deployment.

## 📊 Analytics Integration

Ready for Google Analytics, Plausible, or other analytics services:

```javascript
// Add to head section
gtag('event', 'download', {
  'event_category': 'CleanCue',
  'event_label': platform
});
```

## 🎯 SEO Optimization

- Semantic HTML structure
- Meta descriptions and keywords
- Open Graph social sharing
- Twitter Card support
- Performance optimized (< 100KB total)

## 🚀 Launch Checklist

- [ ] Upload website files to hosting
- [ ] Configure custom domain (cmdrcody.com)
- [ ] Test all download links
- [ ] Verify responsive design on mobile
- [ ] Add SSL certificate
- [ ] Submit to search engines
- [ ] Set up analytics tracking

---

**Built for CmndrCody's CleanCue project** 🎧

Professional website to showcase DJ library management software and drive downloads from the DJ community.