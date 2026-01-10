# 跨平台打包发布流程教程

基于 Zed 项目的最佳实践，适用于 Rust/Node.js 桌面应用。

## 目录结构

```
project/
├── .github/workflows/
│   └── release.yml              # CI/CD 发布工作流
├── script/
│   ├── bundle-mac               # macOS 打包脚本
│   ├── bundle-linux             # Linux 打包脚本
│   └── bundle-windows.ps1       # Windows 打包脚本
├── resources/
│   ├── app-icon.png             # 应用图标
│   ├── app.entitlements         # macOS 权限声明
│   ├── app.desktop.in           # Linux .desktop 模板
│   └── windows/
│       ├── installer.iss        # Inno Setup 脚本
│       └── app.ico              # Windows 图标
└── RELEASE_CHANNEL              # 发布频道标记 (stable/preview/nightly)
```

---

## 1. macOS 打包 (.dmg)

### 脚本: `script/bundle-mac`

```bash
#!/usr/bin/env bash
set -euo pipefail

# 参数
target="${1:-aarch64-apple-darwin}"  # 或 x86_64-apple-darwin
channel="${2:-stable}"
version="${3:-$(cat VERSION)}"

# 1. 编译
cargo build --release --target "$target"

# 2. 创建 .app 结构
app_name="MyApp.app"
app_dir="target/$target/release/$app_name"
mkdir -p "$app_dir/Contents/MacOS"
mkdir -p "$app_dir/Contents/Resources"

cp "target/$target/release/myapp" "$app_dir/Contents/MacOS/"
cp resources/app-icon.icns "$app_dir/Contents/Resources/"
cat > "$app_dir/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key><string>myapp</string>
    <key>CFBundleIdentifier</key><string>com.example.myapp</string>
    <key>CFBundleName</key><string>MyApp</string>
    <key>CFBundleVersion</key><string>${version}</string>
    <key>LSMinimumSystemVersion</key><string>10.15</string>
</dict>
</plist>
EOF

# 3. 代码签名 (需要 Apple Developer 证书)
if [[ -n "${MACOS_CERTIFICATE:-}" ]]; then
    # 导入证书
    echo "$MACOS_CERTIFICATE" | base64 --decode > /tmp/cert.p12
    security create-keychain -p "" build.keychain
    security import /tmp/cert.p12 -k build.keychain -P "$MACOS_CERTIFICATE_PASSWORD" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple: -s -k "" build.keychain

    # 签名
    /usr/bin/codesign --deep --force --timestamp \
        --options runtime \
        --entitlements resources/app.entitlements \
        --sign "Developer ID Application: Your Name" \
        "$app_dir"
fi

# 4. 生成 DMG
dmg_path="target/MyApp-${target##*-}.dmg"
mkdir -p /tmp/dmg-source
cp -r "$app_dir" /tmp/dmg-source/
ln -s /Applications /tmp/dmg-source/Applications

hdiutil create -volname "MyApp" -srcfolder /tmp/dmg-source \
    -ov -format UDZO "$dmg_path"

# 5. Apple 公证 (需要 App Store Connect API Key)
if [[ -n "${APPLE_NOTARIZATION_KEY:-}" ]]; then
    echo "$APPLE_NOTARIZATION_KEY" | base64 --decode > /tmp/notary-key.p8

    xcrun notarytool submit "$dmg_path" --wait \
        --key /tmp/notary-key.p8 \
        --key-id "$APPLE_NOTARIZATION_KEY_ID" \
        --issuer "$APPLE_NOTARIZATION_ISSUER_ID"

    xcrun stapler staple "$dmg_path"
fi

echo "✅ macOS 打包完成: $dmg_path"
```

### macOS 权限文件: `resources/app.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key><true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
    <key>com.apple.security.files.user-selected.read-write</key><true/>
</dict>
</plist>
```

---

## 2. Windows 打包 (.exe)

### 脚本: `script/bundle-windows.ps1`

```powershell
param(
    [string]$Target = "x86_64-pc-windows-msvc",
    [string]$Channel = "stable",
    [string]$Version = (Get-Content VERSION -Raw).Trim()
)

$ErrorActionPreference = "Stop"

# 1. 编译
cargo build --release --target $Target

# 2. 准备 Inno Setup 目录
$innoDir = "target\inno"
New-Item -ItemType Directory -Force -Path $innoDir | Out-Null
Copy-Item "target\$Target\release\myapp.exe" "$innoDir\MyApp.exe"

# 3. Azure Code Signing (可选)
if ($env:AZURE_TENANT_ID) {
    Install-Module -Name TrustedSigning -Force -Scope CurrentUser

    $signParams = @{
        Endpoint = $env:SIGNING_ENDPOINT
        CodeSigningAccountName = $env:ACCOUNT_NAME
        CertificateProfileName = $env:CERT_PROFILE_NAME
        Files = "$innoDir\MyApp.exe"
        FileDigest = "SHA256"
        TimestampRfc3161 = "http://timestamp.acs.microsoft.com"
    }
    Invoke-TrustedSigning @signParams
}

# 4. Inno Setup 打包
$arch = if ($Target -match "aarch64") { "arm64" } else { "x64" }
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" `
    "/DAppVersion=$Version" `
    "/DAppArch=$arch" `
    "/DChannel=$Channel" `
    "resources\windows\installer.iss"

$outputExe = "target\MyApp-$arch.exe"
Write-Host "✅ Windows 打包完成: $outputExe"
```

### Inno Setup 脚本: `resources/windows/installer.iss`

```ini
#define AppName "MyApp"
#define AppExeName "MyApp.exe"

[Setup]
AppId={{YOUR-GUID-HERE}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=..\..\target
OutputBaseFilename=MyApp-{#AppArch}
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
MinVersion=10.0.17763

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"
Name: "addtopath"; Description: "添加到 PATH"

[Files]
Source: "..\inno\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; \
    ValueData: "{olddata};{app}"; Tasks: addtopath; Check: NeedsAddPath('{app}')

[Code]
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Param + ';', ';' + OrigPath + ';') = 0;
end;
```

---

## 3. Linux 打包 (.tar.gz)

### 脚本: `script/bundle-linux`

```bash
#!/usr/bin/env bash
set -euo pipefail

target="${1:-x86_64-unknown-linux-gnu}"
version="${2:-$(cat VERSION)}"
app_name="myapp"

# 1. 编译
export RUSTFLAGS="-C link-arg=-Wl,-rpath,\$ORIGIN/../lib"
cargo build --release --target "$target"

# 2. 准备目录结构
arch="${target%%-*}"
dist_dir="target/${app_name}-linux-${arch}"
rm -rf "$dist_dir"
mkdir -p "$dist_dir"/{bin,lib,share/applications,share/icons/hicolor/512x512/apps}

# 3. 复制二进制
cp "target/$target/release/$app_name" "$dist_dir/bin/"
strip "$dist_dir/bin/$app_name"

# 4. 复制依赖库 (排除系统库)
ldd "target/$target/release/$app_name" | \
    grep "=> /" | \
    awk '{print $3}' | \
    grep -v -E '(libc\.so|libm\.so|libpthread|libdl\.so|libgcc_s)' | \
    xargs -I{} cp {} "$dist_dir/lib/" 2>/dev/null || true

# 5. 生成 .desktop 文件
cat > "$dist_dir/share/applications/${app_name}.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=MyApp
Exec=${app_name}
Icon=${app_name}
Categories=Development;
Terminal=false
EOF

# 6. 复制图标
cp resources/app-icon.png "$dist_dir/share/icons/hicolor/512x512/apps/${app_name}.png"

# 7. 打包
tar_path="target/${app_name}-linux-${arch}.tar.gz"
tar -czf "$tar_path" -C target "${app_name}-linux-${arch}"

echo "✅ Linux 打包完成: $tar_path"
```

---

## 4. GitHub Actions CI/CD

### `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags: ['v*']

env:
  CARGO_TERM_COLOR: always

jobs:
  # 创建 Release 草稿
  create-release:
    runs-on: ubuntu-latest
    outputs:
      upload_url: ${{ steps.create.outputs.upload_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Create Release
        id: create
        uses: softprops/action-gh-release@v2
        with:
          draft: true
          generate_release_notes: true

  # macOS 打包
  build-macos:
    needs: create-release
    strategy:
      matrix:
        target: [aarch64-apple-darwin, x86_64-apple-darwin]
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Build
        run: ./script/bundle-mac ${{ matrix.target }}
        env:
          MACOS_CERTIFICATE: ${{ secrets.MACOS_CERTIFICATE }}
          MACOS_CERTIFICATE_PASSWORD: ${{ secrets.MACOS_CERTIFICATE_PASSWORD }}
          APPLE_NOTARIZATION_KEY: ${{ secrets.APPLE_NOTARIZATION_KEY }}
          APPLE_NOTARIZATION_KEY_ID: ${{ secrets.APPLE_NOTARIZATION_KEY_ID }}
          APPLE_NOTARIZATION_ISSUER_ID: ${{ secrets.APPLE_NOTARIZATION_ISSUER_ID }}

      - name: Upload
        uses: softprops/action-gh-release@v2
        with:
          files: target/*.dmg

  # Windows 打包
  build-windows:
    needs: create-release
    strategy:
      matrix:
        target: [x86_64-pc-windows-msvc, aarch64-pc-windows-msvc]
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Build
        shell: pwsh
        run: ./script/bundle-windows.ps1 -Target ${{ matrix.target }}
        env:
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          SIGNING_ENDPOINT: ${{ secrets.SIGNING_ENDPOINT }}
          ACCOUNT_NAME: ${{ secrets.ACCOUNT_NAME }}
          CERT_PROFILE_NAME: ${{ secrets.CERT_PROFILE_NAME }}

      - name: Upload
        uses: softprops/action-gh-release@v2
        with:
          files: target/*.exe

  # Linux 打包
  build-linux:
    needs: create-release
    strategy:
      matrix:
        target: [x86_64-unknown-linux-gnu, aarch64-unknown-linux-gnu]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install cross-compilation tools
        if: matrix.target == 'aarch64-unknown-linux-gnu'
        run: |
          sudo apt-get update
          sudo apt-get install -y gcc-aarch64-linux-gnu

      - name: Build
        run: ./script/bundle-linux ${{ matrix.target }}

      - name: Upload
        uses: softprops/action-gh-release@v2
        with:
          files: target/*.tar.gz

  # 发布
  publish:
    needs: [build-macos, build-windows, build-linux]
    runs-on: ubuntu-latest
    steps:
      - name: Publish Release
        uses: softprops/action-gh-release@v2
        with:
          draft: false
```

---

## 5. 签名认证密钥清单

### GitHub Secrets 配置

| 密钥名 | 用途 | 获取方式 |
|-------|------|---------|
| `MACOS_CERTIFICATE` | macOS 签名证书 (base64) | Apple Developer 导出 .p12 |
| `MACOS_CERTIFICATE_PASSWORD` | 证书密码 | 导出时设置 |
| `APPLE_NOTARIZATION_KEY` | 公证 API Key (base64) | App Store Connect |
| `APPLE_NOTARIZATION_KEY_ID` | API Key ID | App Store Connect |
| `APPLE_NOTARIZATION_ISSUER_ID` | Issuer ID | App Store Connect |
| `AZURE_TENANT_ID` | Azure 租户 ID | Azure Portal |
| `AZURE_CLIENT_ID` | 服务主体 ID | Azure Portal |
| `AZURE_CLIENT_SECRET` | 服务主体密钥 | Azure Portal |
| `SIGNING_ENDPOINT` | Azure 签名端点 | Azure Code Signing |
| `ACCOUNT_NAME` | 签名账户名 | Azure Code Signing |
| `CERT_PROFILE_NAME` | 证书配置文件 | Azure Code Signing |

---

## 6. 发布流程

```bash
# 1. 更新版本号
echo "1.0.0" > VERSION

# 2. 提交并打标签
git add .
git commit -m "release: v1.0.0"
git tag v1.0.0
git push origin main --tags

# 3. GitHub Actions 自动执行:
#    - 创建 Release 草稿
#    - 并行构建 6 个平台包
#    - 上传所有构件
#    - 发布 Release
```

---

## 7. 本地测试命令

```bash
# macOS
./script/bundle-mac aarch64-apple-darwin

# Linux
./script/bundle-linux x86_64-unknown-linux-gnu

# Windows (PowerShell)
./script/bundle-windows.ps1 -Target x86_64-pc-windows-msvc
```
