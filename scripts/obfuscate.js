const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build', 'static', 'js');

// Obfuscation options - balanced between security and performance
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 5,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

function obfuscateFile(filePath) {
  try {
    console.log(`Obfuscating: ${filePath}`);
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode());
    console.log(`✅ Successfully obfuscated: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error obfuscating ${filePath}:`, error.message);
  }
}

function obfuscateDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory ${dirPath} does not exist. Skipping obfuscation.`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      obfuscateDirectory(filePath);
    } else if (file.endsWith('.js') && !file.includes('.map')) {
      obfuscateFile(filePath);
    }
  }
}

console.log('🔒 Starting JavaScript obfuscation...');
obfuscateDirectory(buildDir);

// Also obfuscate CSS directory for any inline JS
const cssDir = path.join(__dirname, '..', 'build', 'static', 'css');
if (fs.existsSync(cssDir)) {
  // Remove source maps for additional security
  const cssFiles = fs.readdirSync(cssDir);
  cssFiles.forEach(file => {
    if (file.endsWith('.map')) {
      const mapPath = path.join(cssDir, file);
      fs.unlinkSync(mapPath);
      console.log(`🗑️  Removed source map: ${file}`);
    }
  });
}

// Remove JavaScript source maps
const jsFiles = fs.readdirSync(buildDir);
jsFiles.forEach(file => {
  if (file.endsWith('.map')) {
    const mapPath = path.join(buildDir, file);
    fs.unlinkSync(mapPath);
    console.log(`🗑️  Removed source map: ${file}`);
  }
});

console.log('✅ Obfuscation complete!'); 