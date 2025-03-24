# Windows Output Helper
# This script helps format output from Node.js scripts on Windows
# It's specifically designed to handle Docker output formatting issues

param (
    [Parameter(Mandatory=$true)]
    [string]$Command,
    
    [Parameter(Mandatory=$false)]
    [string[]]$Arguments,
    
    [Parameter(Mandatory=$false)]
    [switch]$UseLocalNode
)

# Format the command and arguments for display
$commandDisplay = "$Command $($Arguments -join ' ')"
Write-Host "Executing: $commandDisplay" -ForegroundColor Cyan

# For Docker-based commands, we'll take a different approach
if ($UseLocalNode) {
    # For local Node.js execution, run directly
    & $Command $Arguments
    exit $LASTEXITCODE
} else {
    # For Docker-based execution, we'll use a more direct approach
    # Create a temporary batch file to run the command
    $tempBatchFile = [System.IO.Path]::GetTempFileName() + ".bat"
    
    # Write the command to the batch file
    @"
@echo off
$Command $($Arguments -join ' ') > "%TEMP%\docgen_output.txt" 2>&1
exit %ERRORLEVEL%
"@ | Out-File -FilePath $tempBatchFile -Encoding ascii
    
    # Execute the batch file
    & cmd /c $tempBatchFile
    $exitCode = $LASTEXITCODE
    
    # Read and process the output file
    $outputFile = "$env:TEMP\docgen_output.txt"
    if (Test-Path $outputFile) {
        $content = Get-Content $outputFile -Raw
        
        # Clean up the output
        $content = $content -replace '(?s)WriteStream \{.*?\}', ''
        $content = $content -replace '(?s)fd: null.*?flush: false', ''
        $content = $content -replace '(?s)path:.*?mode: \d+', ''
        $content = $content -replace 'docker debug.*', ''
        $content = $content -replace '(?s)The argument.*?invalid\..*?', ''
        
        # Display the cleaned output
        Write-Host $content
        
        # Clean up
        Remove-Item $outputFile -Force
    }
    
    # Clean up the batch file
    Remove-Item $tempBatchFile -Force
    
    # Return the exit code
    exit $exitCode
}
