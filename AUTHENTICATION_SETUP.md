# 🔐 Authentication Setup Guide

## 🎯 **Overview**

This guide will help you set up a secure, private beta access system for your VGC Team Manager using GitHub OAuth.

**✅ What you'll achieve:**
- Only you have initial access
- You can grant/revoke beta access to specific users
- Users' data stays local (no server-side storage)
- Professional authentication flow
- Works with GitHub Pages and other static hosts

---

## 📋 **Setup Steps**

### **Step 1: Create GitHub OAuth App**

1. **Go to GitHub Settings** → Developer settings → OAuth Apps
2. **Click "New OAuth App"**
3. **Fill in the details:**
   ```
   Application name: VGC Team Manager
   Homepage URL: https://your-username.github.io/vgc-gameplan-manager-react
   Authorization callback URL: https://your-username.github.io/vgc-gameplan-manager-react/auth/callback
   ```
4. **Click "Register application"**
5. **Copy the Client ID** (you'll need this)
6. **Generate a new client secret** and copy it (keep this secure!)

### **Step 2: Deploy OAuth Proxy to Vercel**

Since GitHub Pages can't handle server-side OAuth, we need a simple proxy:

1. **Create a new Vercel project** from the `oauth-proxy` folder
2. **Deploy to Vercel:**
   ```bash
   cd oauth-proxy
   npx vercel --prod
   ```
3. **Set environment variables in Vercel:**
   - Go to your Vercel project settings
   - Add your GitHub Client Secret as an environment variable
4. **Note your Vercel URL** (e.g., `https://your-oauth-proxy.vercel.app`)

### **Step 3: Configure Environment Variables**

Create a `.env` file in your project root:

```bash
# GitHub OAuth Configuration
REACT_APP_GITHUB_CLIENT_ID=your_github_client_id_here
REACT_APP_GITHUB_CLIENT_SECRET=your_github_client_secret_here

# OAuth Proxy URL
REACT_APP_OAUTH_PROXY_URL=https://your-oauth-proxy.vercel.app/api/github-oauth

# Optional: GitHub Gist ID for dynamic user management
REACT_APP_AUTHORIZED_USERS_GIST_ID=your_gist_id_here
```

### **Step 4: Configure Authorized Users**

**Option A: Static List (Simple)**
Edit `src/auth/AuthProvider.tsx`:
```typescript
const AUTHORIZED_USERS = [
  'mannyurbano',    // Replace with your username
  'beta-user-1',             // Add beta users here
  'beta-user-2',
  // Add more users as needed
];
```

**Option B: Dynamic List (Flexible)**
1. Create a **private GitHub Gist**
2. Content should be a JSON array:
   ```json
   ["your-username", "beta-user-1", "beta-user-2"]
   ```
3. Copy the Gist ID from the URL
4. Add it to your `.env` file

### **Step 5: Update OAuth Proxy URL**

In `src/auth/AuthProvider.tsx`, update the proxy URL:
```typescript
const proxyUrl = process.env.REACT_APP_OAUTH_PROXY_URL || 
                 'https://your-oauth-proxy.vercel.app/api/github-oauth';
```

### **Step 6: Build and Deploy**

```bash
# Build with authentication
npm run build:obfuscated

# Deploy to your preferred platform
npm run deploy  # GitHub Pages
# OR
npm run deploy:vercel  # Vercel
```

---

## 🔧 **User Management**

### **Adding Beta Users**

**Static Method:**
1. Edit `AUTHORIZED_USERS` array in `src/auth/AuthProvider.tsx`
2. Rebuild and deploy

**Dynamic Method (Recommended):**
1. Edit your private GitHub Gist
2. Add usernames to the JSON array
3. Changes take effect immediately (no rebuild needed)

### **Revoking Access**

Simply remove the username from your list and the user will be denied access on their next login attempt.

### **Checking Access Logs**

Users will see their GitHub username in the "Access Not Authorized" screen, making it easy for them to share it with you for access requests.

---

## 🛡️ **Security Features**

### **What's Protected:**
- ✅ Only authorized GitHub users can access
- ✅ OAuth state validation prevents CSRF attacks
- ✅ Token validation on every app load
- ✅ Secure token storage in localStorage
- ✅ No user data stored on servers

### **What's NOT Protected:**
- ❌ Code is still viewable in browser dev tools (use desktop app for better protection)
- ❌ Users can save their access tokens (but they expire)

---

## 📱 **Distribution Options**

### **Option 1: GitHub Pages (Recommended)**
```bash
npm run deploy
```
- **Pros:** Free, easy updates, version control
- **Cons:** Code visible in dev tools

### **Option 2: Vercel/Netlify**
```bash
npm run deploy:vercel
```
- **Pros:** Professional domain, better performance
- **Cons:** Still client-side

### **Option 3: Desktop App**
```bash
npm run package:all
```
- **Pros:** Best code protection, offline use
- **Cons:** Larger files, manual distribution

---

## 🔍 **Troubleshooting**

### **"Authentication initialization failed"**
- Check your GitHub Client ID is correct
- Verify OAuth app callback URL matches your domain

### **"Token exchange failed"**
- Check OAuth proxy is deployed and accessible
- Verify Client Secret is set correctly in Vercel

### **"Access Not Authorized"**
- User's GitHub username not in authorized list
- Check spelling and case sensitivity
- For dynamic list: verify Gist ID and format

### **OAuth callback error**
- Callback URL in GitHub app must exactly match your domain
- Include the `/auth/callback` path

---

## 🚀 **Quick Start Checklist**

- [ ] Create GitHub OAuth App
- [ ] Deploy OAuth proxy to Vercel  
- [ ] Set environment variables
- [ ] Update authorized users list
- [ ] Test authentication flow
- [ ] Build and deploy app
- [ ] Share access with beta users

---

## 💡 **Pro Tips**

1. **Use private Gist** for user management to avoid rebuilding
2. **Test thoroughly** with a secondary GitHub account
3. **Keep Client Secret secure** - never commit to git
4. **Monitor access requests** through user feedback
5. **Document your user onboarding** process for beta users

---

## 📞 **Support**

If users need access, they should:
1. Visit your app URL
2. Click "Sign in with GitHub"
3. Note their GitHub username from the "Access Not Authorized" screen
4. Contact you with their username for beta access

**Your app is now secure and ready for private beta distribution!** 🎉 