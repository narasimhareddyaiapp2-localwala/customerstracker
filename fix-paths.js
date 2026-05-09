const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
const repoName = 'customerstracker';
const prefix = `/${repoName}/`;

// Create .nojekyll
const nojekyllPath = path.join(distPath, '.nojekyll');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}
fs.writeFileSync(nojekyllPath, '');
console.log('Created .nojekyll');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function fixPathsInFile(filePath) {
  const ext = path.extname(filePath);
  if (['.html', '.js', '.css', '.json'].includes(ext)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // STRATEGY: Replace all occurrences of the repoName prefix if it's already there to "reset"
    // Then apply the prefix once correctly.
    
    // 1. Remove existing prefixes to prevent doubles (e.g., /customerstracker/customerstracker/ -> /customerstracker/)
    const doublePrefixRegex = new RegExp(`${prefix}${repoName}/`, 'g');
    content = content.replace(doublePrefixRegex, prefix);

    // 2. Fix src and href in HTML that start with / but are not yet prefixed
    if (ext === '.html') {
      // Look for src="/ and href="/ and ensure they become src="/customerstracker/
      content = content.replace(/src="\/(?!(customerstracker\/))/g, `src="${prefix}`);
      content = content.replace(/href="\/(?!(customerstracker\/))/g, `href="${prefix}`);
    }

    // 3. Fix strings in JS/CSS/JSON/HTML that match known asset folders
    // Matches "/assets/", "/_expo/", "/releases/" if not already prefixed
    content = content.replace(/(["'])\/(?!(customerstracker\/))(assets|_expo|releases)\//g, `$1${prefix}$3/`);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`Fixed paths in: ${path.relative(distPath, filePath)}`);
    }
  }
}

if (fs.existsSync(distPath)) {
  walkDir(distPath, (filePath) => {
    fixPathsInFile(filePath);
  });

  // Copy releases folder to dist if it exists
  const releasesPath = path.join(__dirname, 'releases');
  const distReleasesPath = path.join(distPath, 'releases');
  
  if (fs.existsSync(releasesPath)) {
    if (!fs.existsSync(distReleasesPath)) {
      fs.mkdirSync(distReleasesPath, { recursive: true });
    }
    
    fs.readdirSync(releasesPath).forEach(file => {
      const src = path.join(releasesPath, file);
      const dest = path.join(distReleasesPath, file);
      fs.copyFileSync(src, dest);
      console.log(`Copied ${file} to dist/releases/`);
      
      // Also provide a .apk version if it's the .7z file
      if (file === 'customerstracker.7z') {
        const apkDest = path.join(distReleasesPath, 'customerstracker.apk');
        fs.copyFileSync(src, apkDest);
        console.log(`Also copied customerstracker.7z to dist/releases/customerstracker.apk for compatibility`);
      }
    });
  }

  console.log('Successfully fixed paths for GitHub Pages deployment');
} else {
  console.error('dist directory not found. Please run "npx expo export --platform web" first.');
  process.exit(1);
}
