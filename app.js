// Luma Share - Main Application

// CORS Proxies (fallback list)
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest='
];

// Template gradients
const TEMPLATES = {
  'image': null, // Uses event image
  'gradient-sunset': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  'gradient-ocean': 'linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%)',
  'gradient-fire': 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
  'gradient-mint': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'gradient-purple': 'linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%)'
};

let currentTemplate = 'image';
let currentLanguage = 'auto'; // 'auto', 'es', 'en', 'pt'

// DOM Elements
const lumaUrlInput = document.getElementById('luma-url');
const generateBtn = document.getElementById('generate-btn');
const loadingSection = document.getElementById('loading');
const errorSection = document.getElementById('error');
const errorMessage = document.getElementById('error-message');
const previewSection = document.getElementById('preview-section');

// Event Listeners
generateBtn.addEventListener('click', handleGenerate);
lumaUrlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleGenerate();
});

document.querySelectorAll('.download-btn').forEach(btn => {
  btn.addEventListener('click', () => handleDownload(btn.dataset.format));
});

// Template selector
document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTemplate = btn.dataset.template;
    applyTemplate();
  });
});

// Language selector
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLanguage = btn.dataset.lang;
    // Re-render with new language
    if (window.currentEventData) {
      updateCardsText(window.currentEventData);
    }
  });
});

// Main Functions
async function handleGenerate() {
  const url = lumaUrlInput.value.trim();

  if (!url) {
    showError('Please enter a Luma link');
    return;
  }

  const eventId = extractEventId(url);
  if (!eventId) {
    showError('Invalid link. Use a lu.ma or luma.com link (e.g. lu.ma/abc123)');
    return;
  }

  showLoading(true);
  hideError();
  hidePreview();

  try {
    const eventData = await fetchEventData(eventId);
    updateCards(eventData);
    showPreview();
  } catch (error) {
    console.error('Error:', error);
    showError(`Error: ${error.message}. Open browser console (F12) for details.`);
  } finally {
    showLoading(false);
  }
}

function extractEventId(url) {
  // Support formats:
  // - lu.ma/abc123
  // - luma.com/abc123
  // - https://lu.ma/abc123
  // - https://luma.com/abc123
  // - lu.ma/city/abc123 (calendar format)

  try {
    // Clean up the URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const urlObj = new URL(cleanUrl);
    const hostname = urlObj.hostname;

    // Check if it's a Luma URL
    if (!hostname.includes('lu.ma') && !hostname.includes('luma.com')) {
      return null;
    }

    // Get the path segments
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    if (pathSegments.length === 0) {
      return null;
    }

    // The event ID is usually the last segment
    // or in format /city/eventid
    const eventId = pathSegments[pathSegments.length - 1];

    // Event IDs are typically alphanumeric, 6-12 chars
    if (eventId && /^[a-zA-Z0-9_-]+$/.test(eventId)) {
      return eventId;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchEventData(eventId) {
  const eventUrl = `https://lu.ma/${eventId}`;
  let lastError;

  // Try each proxy until one works
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(eventUrl);
      console.log('Trying proxy:', proxy);

      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const html = await response.text();

      // Check if we got actual HTML content
      if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
        throw new Error('Invalid response: not HTML');
      }

      console.log('Fetch successful with proxy:', proxy);
      return parseEventData(html, eventId);
    } catch (error) {
      console.warn(`Proxy ${proxy} failed:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error('All proxies failed');
}

function parseEventData(html, eventId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Try to find JSON-LD data first
  const jsonLdScript = doc.querySelector('script[type="application/ld+json"]');
  let eventData = {};

  if (jsonLdScript) {
    try {
      const jsonData = JSON.parse(jsonLdScript.textContent);
      console.log('JSON-LD data:', jsonData);

      if (jsonData['@type'] === 'Event') {
        // Handle image as array or string
        let imageUrl = jsonData.image;
        if (Array.isArray(imageUrl)) {
          imageUrl = imageUrl[0];
        }

        eventData = {
          title: jsonData.name,
          startDate: jsonData.startDate,
          endDate: jsonData.endDate,
          image: imageUrl,
          location: jsonData.location?.name || jsonData.location?.address?.addressLocality
        };
        console.log('Parsed event data:', eventData);
      }
    } catch (e) {
      console.warn('Could not parse JSON-LD:', e);
    }
  }

  // Fallback: Try to extract from __NEXT_DATA__ or initial state
  if (!eventData.title) {
    const nextDataScript = doc.querySelector('script#__NEXT_DATA__');
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript.textContent);
        const pageProps = nextData.props?.pageProps;
        if (pageProps?.event) {
          const event = pageProps.event;
          eventData = {
            title: event.name,
            startDate: event.start_at,
            endDate: event.end_at,
            image: event.cover_url,
            location: event.geo_address_info?.city || event.location
          };
        }
      } catch (e) {
        console.warn('Could not parse __NEXT_DATA__:', e);
      }
    }
  }

  // Fallback: Try Open Graph meta tags
  if (!eventData.title) {
    eventData.title = doc.querySelector('meta[property="og:title"]')?.content ||
                      doc.querySelector('title')?.textContent || 'Evento';
  }

  if (!eventData.image) {
    eventData.image = doc.querySelector('meta[property="og:image"]')?.content;
  }

  // Try to find date in the HTML content if not found
  if (!eventData.startDate) {
    // Look for common date patterns in the page
    const dateMatch = html.match(/"start_at":"([^"]+)"/);
    if (dateMatch) {
      eventData.startDate = dateMatch[1];
    }
  }

  // Try to find image URL in the HTML
  if (!eventData.image) {
    const imageMatch = html.match(/images\.lumacdn\.com[^"'\s]+event-covers[^"'\s]+/);
    if (imageMatch) {
      eventData.image = 'https://' + imageMatch[0];
    }
  }

  // Format the data
  return {
    title: eventData.title || 'Event',
    date: formatDate(eventData.startDate),
    time: formatTime(eventData.startDate, eventData.endDate),
    image: eventData.image || '',
    eventId: eventId,
    // Keep raw dates for re-formatting
    startDate: eventData.startDate,
    endDate: eventData.endDate
  };
}

function getLocale() {
  if (currentLanguage === 'auto') {
    return navigator.language || 'en-US';
  }
  // Map short codes to full locale
  const localeMap = {
    'es': 'es-ES',
    'en': 'en-US',
    'pt': 'pt-BR'
  };
  return localeMap[currentLanguage] || currentLanguage;
}

function formatDate(dateString) {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    const locale = getLocale();
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

function formatTime(startDate, endDate) {
  if (!startDate) return '';

  try {
    const start = new Date(startDate);
    const locale = getLocale();
    const timeOptions = { hour: '2-digit', minute: '2-digit' };

    let timeStr = start.toLocaleTimeString(locale, timeOptions);

    if (endDate) {
      const end = new Date(endDate);
      timeStr += ' - ' + end.toLocaleTimeString(locale, timeOptions);
    }

    return timeStr;
  } catch {
    return '';
  }
}

function updateCardsText(eventData) {
  const date = formatDate(eventData.startDate);
  const time = formatTime(eventData.startDate, eventData.endDate);

  document.getElementById('story-date').textContent = date;
  document.getElementById('story-time').textContent = time;
  document.getElementById('post-date').textContent = date;
  document.getElementById('post-time').textContent = time;

  // Update stored data
  window.currentEventData.date = date;
  window.currentEventData.time = time;
}

function updateCards(eventData) {
  // Update Story card
  document.getElementById('story-title').textContent = eventData.title;
  document.getElementById('story-date').textContent = eventData.date;
  document.getElementById('story-time').textContent = eventData.time;

  // Update Post card
  document.getElementById('post-title').textContent = eventData.title;
  document.getElementById('post-date').textContent = eventData.date;
  document.getElementById('post-time').textContent = eventData.time;

  // Store event data for download
  window.currentEventData = eventData;

  // Apply current template
  applyTemplate();
}

function applyTemplate() {
  const eventData = window.currentEventData;
  if (!eventData) return;

  const storyBg = document.getElementById('story-background');
  const postBg = document.getElementById('post-background');
  const storyOverlay = document.querySelector('#story-card .card-overlay');
  const postOverlay = document.querySelector('#post-card .card-overlay');

  if (currentTemplate === 'image' && eventData.image) {
    // Use event image
    const highResImage = eventData.image.replace(/width=\d+/, 'width=1200')
                                         .replace(/height=\d+/, 'height=1200');
    storyBg.style.backgroundImage = `url('${highResImage}')`;
    storyBg.style.background = '';
    storyBg.style.backgroundImage = `url('${highResImage}')`;
    storyBg.style.backgroundSize = 'cover';
    storyBg.style.backgroundPosition = 'center top';

    postBg.style.backgroundImage = `url('${highResImage}')`;
    postBg.style.background = '';
    postBg.style.backgroundImage = `url('${highResImage}')`;
    postBg.style.backgroundSize = 'cover';
    postBg.style.backgroundPosition = 'center top';

    // Show overlay for image
    storyOverlay.style.display = 'block';
    postOverlay.style.display = 'block';
  } else {
    // Use gradient template
    const gradient = TEMPLATES[currentTemplate] || TEMPLATES['gradient-sunset'];
    storyBg.style.backgroundImage = 'none';
    storyBg.style.background = gradient;
    postBg.style.backgroundImage = 'none';
    postBg.style.background = gradient;

    // Hide overlay for gradients (cleaner look)
    storyOverlay.style.display = 'none';
    postOverlay.style.display = 'none';
  }
}

async function handleDownload(format) {
  const eventData = window.currentEventData;
  if (!eventData) return;

  const btn = document.querySelector(`.download-btn[data-format="${format}"]`);
  const originalText = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    // Create high-res version for export
    const exportCard = createExportCard(format, eventData);
    document.body.appendChild(exportCard);

    // If using image template, draw blurred image to canvas
    const useImage = currentTemplate === 'image' && eventData.image;
    if (useImage) {
      await drawBlurredImage(exportCard, format, eventData.image);
    }

    // Small delay to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate canvas
    const canvas = await html2canvas(exportCard, {
      width: format === 'story' ? 1080 : 1080,
      height: format === 'story' ? 1920 : 1350,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#000000',
      logging: false
    });

    // Convert to blob for sharing/downloading
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const fileName = `luma-${format}-${eventData.eventId}.png`;

    // On mobile, try Web Share API first (allows saving to Photos on iOS)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'image/png' });
      const shareData = { files: [file] };

      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          document.body.removeChild(exportCard);
          btn.textContent = originalText;
          btn.disabled = false;
          return;
        } catch (e) {
          // User cancelled or share failed, fall back to download
          console.log('Share cancelled, falling back to download');
        }
      }
    }

    // Fallback: regular download
    const link = document.createElement('a');
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);

    // Cleanup
    document.body.removeChild(exportCard);
  } catch (error) {
    console.error('Download error:', error);
    console.error('Event data:', eventData);
    alert(`Error generating image: ${error.message}`);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function drawBlurredImage(container, format, imageUrl) {
  const canvas = container.querySelector(`#blur-canvas-${format}`);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Try to load image through proxy to avoid CORS issues
  let img;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;

  try {
    img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image load failed'));
      image.src = proxyUrl;
    });
  } catch (e) {
    console.warn('Could not load image for blur, using fallback color');
    // Fill with a nice gradient as fallback
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Calculate cover dimensions
  const imgRatio = img.width / img.height;
  const canvasRatio = width / height;

  let drawWidth, drawHeight, drawX, drawY;

  if (imgRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * imgRatio;
    drawX = (width - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = width;
    drawHeight = width / imgRatio;
    drawX = 0;
    drawY = 0; // top alignment
  }

  // Check if ctx.filter is supported (not on iOS Safari)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (!isIOS) {
    // Use native blur filter on desktop/Android
    ctx.filter = 'blur(22px)';
  }

  // Draw image slightly larger to avoid edge artifacts
  const scale = 1.1;
  const scaledWidth = drawWidth * scale;
  const scaledHeight = drawHeight * scale;
  const offsetX = (scaledWidth - drawWidth) / 2;
  const offsetY = (scaledHeight - drawHeight) / 2;

  ctx.drawImage(
    img,
    drawX - offsetX,
    drawY - offsetY,
    scaledWidth,
    scaledHeight
  );

  // Reset filter
  ctx.filter = 'none';

  // On iOS, add extra dark overlay since we can't blur
  if (isIOS) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
  }
}

function createExportCard(format, eventData) {
  const isStory = format === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1350;

  const useImage = currentTemplate === 'image' && eventData.image;
  const gradient = TEMPLATES[currentTemplate];

  const card = document.createElement('div');
  card.className = `export-card ${format}`;
  card.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${width}px;
    height: ${height}px;
    background: ${useImage ? '#000' : (gradient || TEMPLATES['gradient-sunset'])};
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // For image: create blurred background using canvas since CSS filter doesn't work well in html2canvas
  const overlayHtml = useImage ? `
    <canvas id="blur-canvas-${format}" width="${width}" height="${height}" style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    "></canvas>
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
    "></div>
  ` : '';

  card.innerHTML = `
    ${overlayHtml}
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px;
      color: white;
      text-align: center;
    ">
      <p style="
        font-size: ${isStory ? '42px' : '36px'};
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.9;
        margin: 0 0 32px 0;
      ">${eventData.date}</p>
      <h2 style="
        font-size: ${isStory ? '86px' : '72px'};
        font-weight: 700;
        line-height: 1.2;
        margin: 0 0 32px 0;
      ">${eventData.title}</h2>
      <p style="
        font-size: ${isStory ? '42px' : '36px'};
        opacity: 0.8;
        margin: 0;
      ">${eventData.time}</p>
    </div>
    <div style="
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 50px 60px;
      display: flex;
      justify-content: flex-end;
    ">
      <span style="
        font-size: 28px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.2);
        padding: 16px 32px;
        border-radius: 16px;
        color: white;
      ">lu.ma</span>
    </div>
  `;

  return card;
}

// UI Helpers
function showLoading(show) {
  loadingSection.classList.toggle('hidden', !show);
  generateBtn.disabled = show;
}

function showError(message) {
  errorMessage.textContent = message;
  errorSection.classList.remove('hidden');
}

function hideError() {
  errorSection.classList.add('hidden');
}

function showPreview() {
  previewSection.classList.remove('hidden');
}

function hidePreview() {
  previewSection.classList.add('hidden');
}
