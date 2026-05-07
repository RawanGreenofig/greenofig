# Push VAPID env vars from .env.local into Vercel (production scope).
#
# Run once from the `next/` directory:
#   1. npx vercel login          # interactive — uses your default browser
#   2. npx vercel link            # links this folder to the Vercel project
#   3. .\scripts\add-vercel-env.ps1
#   4. npx vercel --prod          # redeploy with the new env
#
# The script never prints the private key. It pipes each value
# straight into `vercel env add` via stdin.

$ErrorActionPreference = 'Stop'

$envPath = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path $envPath)) {
    Write-Error "Could not find $envPath"
    exit 1
}

function Get-EnvValue {
    param([string]$Key)
    $line = Select-String -Path $envPath -Pattern "^$Key=" -CaseSensitive | Select-Object -First 1
    if (-not $line) { Write-Error "Missing $Key in .env.local"; exit 1 }
    # Strip "KEY=" prefix and any surrounding quotes
    $val = $line.Line.Substring($Key.Length + 1).Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
    return $val
}

$pub  = Get-EnvValue 'NEXT_PUBLIC_VAPID_PUBLIC_KEY'
$priv = Get-EnvValue 'VAPID_PRIVATE_KEY'
$subj = Get-EnvValue 'VAPID_SUBJECT'

Write-Host "[add-vercel-env] Adding 3 vars to Vercel (production)..."
Write-Host "  NEXT_PUBLIC_VAPID_PUBLIC_KEY = $pub"
Write-Host "  VAPID_PRIVATE_KEY            = <hidden, length=$($priv.Length)>"
Write-Host "  VAPID_SUBJECT                = $subj"
Write-Host ""

# Each var: remove existing (ignore failure if absent), then add fresh
$targets = @(
    @{ Name = 'NEXT_PUBLIC_VAPID_PUBLIC_KEY'; Value = $pub  }
    @{ Name = 'VAPID_PRIVATE_KEY';            Value = $priv }
    @{ Name = 'VAPID_SUBJECT';                Value = $subj }
)

foreach ($t in $targets) {
    Write-Host "→ $($t.Name)"
    # Best-effort remove (silently swallow "not found")
    & npx --yes vercel env rm $t.Name production --yes 2>$null | Out-Null
    # Pipe the value into stdin so it never appears on the command line
    $t.Value | & npx --yes vercel env add $t.Name production
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to add $($t.Name) — are you logged in (npx vercel whoami) and linked (npx vercel link)?"
        exit 1
    }
}

Write-Host ""
Write-Host "✅ All three VAPID vars set on Vercel production."
Write-Host "   Trigger a redeploy:  npx vercel --prod"
