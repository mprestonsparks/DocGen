#!/usr/bin/env node
/**
 * GitHub Token Format Test
 * 
 * This script tests the correct formatting for GitHub tokens
 */

const axios = require('axios');

// The tokens to test - we'll use a dummy token beginning with each potential prefix
// (GitHub PATs start with different prefixes based on type - ghp_, gho_, github_, etc.)
const testTokens = [
  {name: "Default token format", format: "token %s", token: "ghp_1234567890abcdefghijklmnopqrstuvwxyz"},
  {name: "Bearer token format", format: "Bearer %s", token: "ghp_1234567890abcdefghijklmnopqrstuvwxyz"},
  {name: "Direct token (no prefix)", format: "%s", token: "ghp_1234567890abcdefghijklmnopqrstuvwxyz"},
  {name: "Classic token", format: "token %s", token: "github_pat_1234567890abcdefghijklmnopqrstuvwxyz"}
];

// Set the PAT format correctly from .env
const rawTokenValue = "ghp_11ABZEABQ0wELGp2UczEqB_mDtYYTMR7HS1KcVAijrMDr0o7W6f1xrSdI5IpNiY63ML34PKERQpd4uN3Iq";

// Test if there might be special characters in the token that need fixing
console.log("Token inspection:");
console.log(`- Length: ${rawTokenValue.length}`);
console.log(`- Contains underscore: ${rawTokenValue.includes('_')}`);
console.log(`- Contains spaces: ${rawTokenValue.includes(' ')}`);
console.log(`- Contains newline: ${rawTokenValue.includes('\n')}`);
console.log(`- First 5 characters: ${rawTokenValue.substring(0, 5)}`);
console.log(`- Characters at position 20-25: ${rawTokenValue.substring(20, 25)}`);

console.log("\nTesting expected token formats (will always fail with dummy tokens, but shows right header format)");
testTokens.forEach(testToken => {
  console.log(`\nTesting: ${testToken.name}`);
  console.log(`Header format: ${testToken.format.replace('%s', '***')}`);
  console.log(`Authorization: ${testToken.format.replace('%s', testToken.token.substring(0, 5) + '...')}`);
});

// The real issue might be with whitespace or special characters
const cleanToken = rawTokenValue.trim();
console.log("\nCleaned token test:");
console.log(`Original token length: ${rawTokenValue.length}`);
console.log(`Cleaned token length: ${cleanToken.length}`);

// Check if the token contains a CR/LF character commonly found when copying from a website
if (rawTokenValue.match(/[\r\n]/)) {
  console.log("⚠️ WARNING: Token contains newline characters. This may cause authentication to fail.");
}

// Check if token is being truncated somewhere
if (rawTokenValue.length < 30) {
  console.log("⚠️ WARNING: Token length is suspiciously short. GitHub tokens are typically much longer.");
}

// Check if the token is properly formatted
if (!rawTokenValue.match(/^[a-zA-Z0-9_\-]+$/)) {
  console.log("⚠️ WARNING: Token contains characters other than letters, numbers, underscores, and dashes.");
}

console.log("\nRecommendations based on token inspection:");
console.log("1. Make sure the token doesn't have trailing whitespace or newlines");
console.log("2. Ensure the token hasn't been truncated during copy-paste");
console.log("3. Try generating a new token if issues persist");