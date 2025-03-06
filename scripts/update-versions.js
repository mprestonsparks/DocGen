#!/usr/bin/env node

/**
 * DocGen - Version Management System
 * 
 * This script updates version numbers across documentation files
 * to ensure consistency and proper version tracking.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');

// Configuration paths
const DOCS_DIR = path.join(__dirname, '../docs/generated');

// Version bump types
const BUMP_TYPES = ['patch', 'minor', 'major'];

/**
 * Main version update function
 */
async function updateVersions() {
  const args = process.argv.slice(2);
  
  // Check for bump type argument
  if (args.length === 0 || !BUMP_TYPES.includes(args[0])) {
    console.log('Usage: update-versions.js <bump-type>');
    console.log('  bump-type: patch, minor, or major');
    process.exit(1);
  }
  
  const bumpType = args[0];
  console.log(`Running DocGen Version Update - ${bumpType} bump`);
  console.log('--------------------------------------');
  
  // Get all markdown files in the generated docs directory
  const docFiles = getDocumentFiles();
  
  if (docFiles.length === 0) {
    console.log('⚠️ No documentation files found. Please run the interview system first.');
    process.exit(1);
  }
  
  console.log(`Found ${docFiles.length} documentation files to update.\n`);
  
  // Update version in each file
  const results = await updateDocumentVersions(docFiles, bumpType);
  
  // Display results
  displayUpdateResults(results);
}

/**
 * Get all markdown files in the generated docs directory
 */
function getDocumentFiles() {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      return [];
    }
    
    return fs.readdirSync(DOCS_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(DOCS_DIR, file));
  } catch (error) {
    console.error('Error finding document files:', error.message);
    return [];
  }
}

/**
 * Update version in all document files
 */
async function updateDocumentVersions(filePaths, bumpType) {
  const results = {
    updated: [],
    skipped: [],
    errors: []
  };
  
  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract YAML front matter
      const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!yamlMatch || !yamlMatch[1]) {
        results.skipped.push({
          path: filePath,
          reason: 'No YAML front matter found'
        });
        continue;
      }
      
      // Parse YAML
      let metadata;
      try {
        metadata = yaml.load(yamlMatch[1]);
      } catch (error) {
        results.errors.push({
          path: filePath,
          error: `Error parsing YAML: ${error.message}`
        });
        continue;
      }
      
      // Check if document has version
      if (!metadata.documentVersion) {
        results.skipped.push({
          path: filePath,
          reason: 'No documentVersion field found in metadata'
        });
        continue;
      }
      
      // Update version
      const currentVersion = metadata.documentVersion;
      const newVersion = semver.inc(currentVersion, bumpType);
      
      if (!newVersion) {
        results.errors.push({
          path: filePath,
          error: `Invalid version format: ${currentVersion}`
        });
        continue;
      }
      
      // Update last updated timestamp
      const nowIso = new Date().toISOString();
      metadata.lastUpdated = nowIso;
      metadata.documentVersion = newVersion;
      
      // Format updated YAML
      const updatedYaml = yaml.dump(metadata, { lineWidth: -1 });
      
      // Replace YAML in content
      const updatedContent = content.replace(/^---\n[\s\S]*?\n---/, `---\n${updatedYaml}---`);
      
      // Update revision history if present
      let finalContent = updatedContent;
      const revisionMatch = updatedContent.match(/### [\d.]+\s*REVISION HISTORY[\s\S]*?\|\s*REV\d+\s*\|\s*[\d-]+T/);
      if (revisionMatch) {
        const newRevId = `REV${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`;
        const revisionEntry = `| ${newRevId} | ${nowIso} | ${bumpType} version update | AUTH001 |\n`;
        finalContent = updatedContent.replace(/(### [\d.]+\s*REVISION HISTORY[\s\S]*?)((?:\|[^\n]*\|\n)+)/, `$1${revisionEntry}$2`);
      }
      
      // Write updated content back to file
      fs.writeFileSync(filePath, finalContent);
      
      results.updated.push({
        path: filePath,
        oldVersion: currentVersion,
        newVersion: newVersion
      });
    } catch (error) {
      results.errors.push({
        path: filePath,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Display update results
 */
function displayUpdateResults(results) {
  console.log('Version Update Results:');
  console.log('======================\n');
  
  // Updated files
  console.log('1. Updated Files:');
  if (results.updated.length === 0) {
    console.log('   No files were updated.');
  } else {
    results.updated.forEach(update => {
      console.log(`   - ${path.basename(update.path)}: ${update.oldVersion} -> ${update.newVersion}`);
    });
  }
  console.log();
  
  // Skipped files
  console.log('2. Skipped Files:');
  if (results.skipped.length === 0) {
    console.log('   No files were skipped.');
  } else {
    results.skipped.forEach(skip => {
      console.log(`   - ${path.basename(skip.path)}: ${skip.reason}`);
    });
  }
  console.log();
  
  // Errors
  console.log('3. Errors:');
  if (results.errors.length === 0) {
    console.log('   No errors occurred.');
  } else {
    results.errors.forEach(error => {
      console.log(`   - ${path.basename(error.path)}: ${error.error}`);
    });
  }
  console.log();
  
  // Overall result
  console.log('Overall Result:');
  if (results.updated.length > 0 && results.errors.length === 0) {
    console.log(`✅ Successfully updated ${results.updated.length} documents.`);
  } else if (results.updated.length > 0 && results.errors.length > 0) {
    console.log(`⚠️ Updated ${results.updated.length} documents with ${results.errors.length} errors.`);
  } else {
    console.log('❌ No documents were updated.');
  }
}

// Run the version update
updateVersions().catch(error => {
  console.error('Error in version update process:', error);
  process.exit(1);
});