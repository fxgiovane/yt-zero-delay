<p align="center">
  <img src="icons/icon128.png" width="80" alt="Sem Atraso">
</p>

<h1 align="center">Sem Atraso</h1>

<p align="center">
  Extensão Chrome para redução ativa de latência em lives do YouTube.
  <br>
  <i>Chrome extension for active latency reduction on YouTube livestreams.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/versão-2.5.0-8b5cf6?style=flat-square" alt="Versão 2.5.0">
  <img src="https://img.shields.io/badge/licença-MIT-green?style=flat-square" alt="MIT">
  <img src="https://img.shields.io/badge/idiomas-18-orange?style=flat-square" alt="i18n">
</p>

---

## Português

O YouTube mantém de 10 a 20 segundos de buffer entre o que você assiste e o sinal real. A extensão acelera o vídeo de forma sutil pra consumir esse buffer e diminuir o atraso até o mínimo possível.

### Instalação

#### 1. Instalação oficial (Chrome Web Store)
Acesse a [página oficial da extensão na Chrome Web Store](https://chromewebstore.google.com/detail/acdcolklblakndmefcakmbpjalileeif?utm_source=item-share-cb) e clique em **Usar no Chrome** para instalar e receber atualizações automáticas.

#### 2. Instalação via PowerShell (Desenvolvedor)
Cole no **PowerShell** e aperte Enter:

```powershell
$d="$env:USERPROFILE\Downloads\yt-zero-delay"; Invoke-WebRequest "https://github.com/fxgiovane/yt-zero-delay/archive/refs/heads/main.zip" -OutFile "$d.zip"; Expand-Archive "$d.zip" -DestinationPath $d -Force; Remove-Item "$d.zip"; Write-Host "`nBaixado em: $d\yt-zero-delay-main`nAgora abra chrome://extensions, ative o Modo do Desenvolvedor e carregue essa pasta." -ForegroundColor Green
```

#### 3. Instalação manual (ZIP)

1. [Baixe o ZIP](https://github.com/fxgiovane/yt-zero-delay/archive/refs/heads/main.zip) e extraia onde preferir
2. Acesse `chrome://extensions`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação**
5. Selecione a pasta `yt-zero-delay-main`
6. Abra uma live no YouTube e clique no ícone da extensão

### Como funciona

**Aceleração** - o vídeo roda entre 1.05x e 1.25x dependendo do perfil. Você não nota a diferença, mas a cada 10 segundos o atraso diminui um pouco até chegar perto do mínimo.

**Buffer** - se o buffer ficar fino demais pro perfil ativo, a velocidade volta pra 1.0x pra não travar. Quando normaliza, acelera de novo.

**Seek** - se você ficar mais de 6 segundos atrás, a extensão tenta pular pro ao vivo de 3 formas diferentes até conseguir.

### Perfis

| Perfil | Normal | Máxima | Alvo |
|--------|--------|--------|------|
| Ultra | 1.15x | 1.25x | ~0.8s |
| Agressivo | 1.10x | 1.20x | ~1.5s |
| Seguro | 1.05x | 1.08x | ~3.0s |
| Personalizado | 1.10x | 1.20x | você define |

### Screenshots

<p align="center">
  <img src="screenshots/sincronizando.png" width="260" alt="Reduzindo delay">
  &nbsp;&nbsp;
  <img src="screenshots/sincronizado.png" width="260" alt="Sincronizado">
</p>

### Proteções

| Nome | Função |
|------|--------|
| Buffer Guard | Freia a aceleração se o buffer ficar fino |
| Circuit Breaker | Para de tentar seek depois de 3 falhas seguidas |
| Ad Shield | Pausa tudo durante anúncios |
| Error Recovery | Recarrega o player se ele travar |
| SPA Safe | Não precisa dar F5 ao trocar de vídeo |

---

## English

YouTube keeps a 10-20 second buffer between what you see and the actual live signal. This extension speeds up playback slightly to eat through that buffer and bring latency down.

### Installation

#### 1. Official installation (Chrome Web Store)
Go to the [official Chrome Web Store page](https://chromewebstore.google.com/detail/acdcolklblakndmefcakmbpjalileeif?utm_source=item-share-cb) and click **Add to Chrome** to install and receive automatic updates.

#### 2. PowerShell installation (Developer)
Paste in **PowerShell** and press Enter:

```powershell
$d="$env:USERPROFILE\Downloads\yt-zero-delay"; Invoke-WebRequest "https://github.com/fxgiovane/yt-zero-delay/archive/refs/heads/main.zip" -OutFile "$d.zip"; Expand-Archive "$d.zip" -DestinationPath $d -Force; Remove-Item "$d.zip"; Write-Host "`nDownloaded to: $d\yt-zero-delay-main`nNow open chrome://extensions, enable Developer Mode and load that folder." -ForegroundColor Green
```

#### 3. Manual installation (ZIP)

1. [Download the ZIP](https://github.com/fxgiovane/yt-zero-delay/archive/refs/heads/main.zip) and extract it
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `yt-zero-delay-main` folder
6. Open a YouTube livestream and click the extension icon

### How it works

**Acceleration** - video runs between 1.05x and 1.25x depending on the profile. You won't notice the difference, but every 10 seconds the delay shrinks a bit until it's near minimum.

**Buffer** - if the buffer gets too thin for the active profile, speed goes back to 1.0x to avoid stuttering. When it recovers, acceleration resumes.

**Seek** - if you fall more than 6 seconds behind, the extension tries 3 different methods to jump back to live.

---

## Estrutura / Structure

```
content.js      Motor de aceleração / Acceleration engine
bridge.js       Bridge Main World (YouTube native APIs)
background.js   Update checker e injeção automática
popup.html      Interface do popup / Popup UI
popup.js        Lógica e i18n / Logic and i18n
manifest.json   Manifest V3
_locales/       18 idiomas (pt_BR, en, es, fr, de, it, ja, ko, zh_CN...)
icons/          16, 32, 48, 128px
```

## Licença / License

MIT
