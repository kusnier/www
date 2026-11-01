param([Parameter(Mandatory=$true)][string]$EmsdkRoot)
$ErrorActionPreference = 'Stop'
$repository = Split-Path $PSScriptRoot -Parent
$sdk = (Resolve-Path -LiteralPath $EmsdkRoot).Path
$python = Get-ChildItem -Path "$sdk/python/*/python.exe" | Select-Object -First 1
if (!$python) { throw 'Emscripten SDK Python is missing. Install and activate SDK 6.0.13 first.' }
$env:EMSDK_PYTHON = $python.FullName
$env:EM_CONFIG = Join-Path $sdk '.emscripten'
$source = Join-Path $repository 'public/vendor/jabcode/source'
$files = Get-ChildItem -LiteralPath $source -Filter '*.c' | ForEach-Object FullName
$arguments = @($files) + @(
  (Join-Path $PSScriptRoot 'jab-web.c'), '-I', $source,
  '-O2', '--no-entry', '-lm', '-sALLOW_MEMORY_GROWTH=1', '-sMAXIMUM_MEMORY=268435456',
  '-sSTACK_SIZE=2097152', '-sFILESYSTEM=0', '-sENVIRONMENT=web,worker,node',
  '-sEXPORTED_FUNCTIONS=["_malloc","_free","_version","_web_write","_web_read","_free_jab_encode_result","_free_jab_decode_result"]',
  '-sEXPORTED_RUNTIME_METHODS=["cwrap","getValue","HEAPU8"]',
  '-o', (Join-Path $repository 'public/vendor/jabcode/jabcode.wasm.js')
)
& (Join-Path $sdk 'upstream/emscripten/emcc.exe') @arguments
if ($LASTEXITCODE -ne 0) { throw 'JAB WebAssembly build failed.' }
