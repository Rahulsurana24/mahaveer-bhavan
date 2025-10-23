# Files to Copy for WhatsApp Integration

If you can't access the files directly, here's what needs to be added/updated:

## ✅ New Files to Create

### 1. `src/components/admin/WhatsAppSessionManager.tsx`
Location in workspace: `/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/src/components/admin/WhatsAppSessionManager.tsx`

### 2. `src/components/admin/WhatsAppStatusIndicator.tsx`
Location: `/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/src/components/admin/WhatsAppStatusIndicator.tsx`

### 3. `src/utils/whatsapp.ts`
Location: `/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/src/utils/whatsapp.ts`

### 4. `server/` folder - Entire folder with:
- `server/index.js`
- `server/package.json`
- `server/.gitignore`
- `server/README.md`

Location: `/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/server/`

### 5. `supabase/migrations/20251023190000_whatsapp_integration.sql`
Location: `/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/supabase/migrations/20251023190000_whatsapp_integration.sql`

### 6. Configuration Files:
- `render.yaml`
- `.env` (updated with WhatsApp config)

### 7. Documentation:
- `DEPLOY_TO_RENDER.md`
- `WHATSAPP_INTEGRATION_GUIDE.md`
- `WHATSAPP_QUICKSTART.md`
- `WHATSAPP_AUTOMATION_COMPLETE.md`

---

## 📝 Modified Files

### `src/pages/admin/CommunicationCenter.tsx`
Location: `/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/src/pages/admin/CommunicationCenter.tsx`

**Changes Made:**
- Added WhatsApp imports (lines 26-34)
- Added WhatsAppStatusIndicator in header (line 290)
- Added "WhatsApp Settings" tab (line 303)
- Added WhatsApp tab content (lines 481-483)
- Added WhatsApp sending logic in sendMessageMutation (lines 81-136)

---

## 🚀 After Copying Files

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Add WhatsApp integration"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Netlify auto-deploys** (~2 minutes)

4. **Then you'll see:**
   - WhatsApp Settings tab in Communication Center ✅
   - WhatsApp checkbox in Compose tab ✅
   - WhatsApp status indicator in header ✅

---

## ⚡ Quick Alternative

If you have SSH access to the workspace:

```bash
# On your local machine
scp -r user@workspace:/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/server ./
scp -r user@workspace:/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/src/components/admin/WhatsApp*.tsx ./src/components/admin/
scp -r user@workspace:/workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/src/utils/whatsapp.ts ./src/utils/
# ... etc
```

Or use git:

```bash
# In your local repo
git remote add workspace /workspace/cmh31wsit005nq2i31pc3tg0y/mahaveer-bhavan/.git
git fetch workspace
git merge workspace/main
```
