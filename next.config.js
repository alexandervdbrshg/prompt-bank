/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
```

4. Commit the changes

---

## File 3: `.gitignore`

**Path:** `.gitignore` (in the root)

1. Click "Add file" → "Create new file"
2. Name it: `.gitignore`
3. Copy and paste:
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
