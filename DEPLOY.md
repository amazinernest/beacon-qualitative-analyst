# Deployment Guide

## Setting up GitHub

1. **Configure your Git identity** (if not already set globally):
```bash
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"
```

Or for this repository only:
```bash
git config user.email "your-email@example.com"
git config user.name "Your Name"
```

2. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Name it (e.g., "beacon-qualitative-analyst")
   - Don't initialize with README (we already have one)

3. **Add the remote and push**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Deploy to Vercel (Recommended for Next.js)

1. **Push to GitHub** (see above)

2. **Import on Vercel**:
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings
   - Click "Deploy"

3. **Your app will be live** at `https://your-project.vercel.app`

## Deploy to Netlify

1. **Push to GitHub**

2. **Import on Netlify**:
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Connect GitHub and select your repository
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Click "Deploy site"

## Environment Variables

Currently, no environment variables are required. If you add features requiring API keys, create a `.env.local` file:

```
NEXT_PUBLIC_API_KEY=your_key_here
```

Then add these to your hosting platform's environment variables settings.

