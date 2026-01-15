# Git Setup & GitHub Deployment Guide

## ✅ Step 1: Git Installation - COMPLETE
Git is now installed and ready to use!

## Step 2: Configure Git (REQUIRED - Run these commands now)

**Replace with your actual name and email:**

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Example:**
```bash
git config --global user.name "Rayan Yusuf"
git config --global user.email "rayan@example.com"
```

## ✅ Step 3: Git Repository - ALREADY DONE
- ✅ Repository initialized
- ✅ All files staged and ready to commit

## Step 4: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `rayanyusuf` (or any name you prefer)
3. Make it **Public** or **Private** (your choice)
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 5: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/rayanyusuf.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 6: Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with your GitHub account
3. Click "Add New Project"
4. Import your `rayanyusuf` repository
5. Vercel will auto-detect Next.js settings
6. Click "Deploy"
7. Your site will be live in minutes!

---

**Note**: If you encounter any issues, make sure Git is properly installed and you've restarted your terminal after installation.
