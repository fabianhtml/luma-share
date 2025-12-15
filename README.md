# Luma Share

Create beautiful, shareable images for your Luma events - like Spotify's share cards, but for events.

![Luma Share](https://img.shields.io/badge/status-beta-orange)
[![GitHub](https://img.shields.io/github/stars/fabianhtml/luma-share?style=social)](https://github.com/fabianhtml/luma-share)

## What is this?

Luma Share is a simple tool that generates Instagram-ready images from your Luma event links. Just paste your event URL and get beautiful cards optimized for Stories (9:16) and Posts (4:5).

## Features

- **Automatic data extraction** - Fetches event title, date, time, and cover image from any Luma event
- **Two formats** - Story (1080x1920) and Post (1080x1350) optimized for Instagram
- **Multiple templates** - Use the event's cover image with blur effect, or choose from gradient backgrounds
- **Instant download** - Get high-resolution PNG files ready to share

## Templates

| Template | Description |
|----------|-------------|
| Image | Uses the event's cover image with a blur effect |
| Sunset | Purple to pink gradient |
| Dark | Dark blue gradient |
| Fire | Orange to red gradient |
| Mint | Green gradient |
| Purple | Purple gradient |

## Usage

1. Go to your Luma event page
2. Copy the URL (e.g., `lu.ma/your-event` or `luma.com/your-event`)
3. Paste it in Luma Share
4. Choose a template
5. Download your Story or Post image
6. Share on Instagram!

## Tech Stack

- Vanilla HTML, CSS, JavaScript
- [html2canvas](https://html2canvas.hertzen.com/) for image generation
- No framework, no build step

## Running Locally

```bash
# Clone the repo
git clone https://github.com/fabianhtml/luma-share.git
cd luma-share

# Start a local server (Python)
python3 -m http.server 8080

# Or use any static file server
npx serve
```

Then open `http://localhost:8080` in your browser.

## Deployment

This is a static site - deploy it anywhere:

- **Cloudflare Pages** - Just connect your repo
- **Vercel** - Zero config deployment
- **Netlify** - Drag and drop the folder
- **GitHub Pages** - Enable in repo settings

## Limitations

- Requires CORS proxy for fetching Luma data (uses public proxies)
- Image quality depends on the event's cover image
- Date/time displayed in user's local timezone

## Contributing

PRs welcome! Some ideas:

- [ ] More gradient templates
- [ ] Custom color picker
- [ ] QR code with event link
- [ ] Copy to clipboard functionality
- [ ] Support for other event platforms

## Author

Created by [@fabianhtml](https://github.com/fabianhtml)

## License

MIT
