# 🎯 CrazyTyper - Authentic Typewriter Text Generator

Transform any text into realistic typewriter output with authentic imperfections from the 1920s-1970s era.

## 🚀 Features

- **AI Text Generation**: Create period-authentic documents using OpenAI
- **Text Transformation**: Convert existing text to typewriter format
- **50+ Page Support**: Generate documents up to 50 pages (20,000+ words)
- **Custom Fonts**: Upload your own typewriter fonts (.woff, .woff2, .ttf, .otf)
- **Realistic Imperfections**: Typos, faded characters, uneven spacing, stuck keys
- **Multiple Eras**: 1920s-1970s period-authentic styling
- **Neobrutalism UI**: Bold, colorful, modern interface

## 📁 Project Structure

```
CrazyTyper/
├── frontend/
│   ├── index.html          # Main interface
│   ├── style.css           # Neobrutalism styling
│   ├── script.js           # Frontend logic
│   └── vercel.json         # Frontend deployment config
└── backend/
    ├── server.js           # Express server & OpenAI proxy
    ├── package.json        # Dependencies
    ├── .env.example        # Environment variables template
    └── .gitignore          # Git ignore rules
```

## 🛠️ Local Development

### Backend Setup
```bash
cd backend/
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your OpenAI API key

npm run dev  # Starts on http://localhost:3001
```

### Frontend Setup
```bash
# Serve frontend (any method):
npx serve .                    # Using serve
python -m http.server 8000     # Python
# Or open index.html directly
```

## 🌐 Deployment

### Backend (Render)
1. Push backend to GitHub repo
2. Connect Render to your repo
3. Set environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `NODE_ENV`: production
   - `FRONTEND_URL`: Your Vercel URL

### Frontend (Vercel)
1. Update `script.js` with your Render backend URL
2. Deploy: `npx vercel --prod`

## 🔧 Configuration

### Backend Environment Variables
```bash
OPENAI_API_KEY=sk-...           # Your OpenAI API key
PORT=3001                       # Server port
NODE_ENV=production             # Environment
FRONTEND_URL=https://...        # Frontend URL for CORS
MAX_WORDS=20000                 # Optional: word limit for cost control
```

### API Endpoints
- `GET /health` - Health check
- `POST /api/generate-text` - Generate typewriter text

## 🎨 Customization

### Adding New Fonts
1. Include font in HTML head
2. Add option to select elements
3. Add CSS class in style.css

### Adjusting Imperfections
Edit `imperfectionTypes` object in `script.js`:
```javascript
const imperfectionTypes = {
    light: { typoChance: 0.005, fadedChance: 0.02 },
    medium: { typoChance: 0.01, fadedChance: 0.04 },
    heavy: { typoChance: 0.02, fadedChance: 0.06 }
};
```

## 🔒 Security Features

- Rate limiting (30 requests/15 minutes)
- CORS protection
- Input validation & sanitization
- API key secured in backend
- Helmet.js security headers

## 💰 Cost Management

- Automatic model selection (GPT-3.5 vs GPT-4)
- Configurable word limits
- Rate limiting to prevent abuse
- Request size limits

## 🐛 Troubleshooting

### Common Issues
1. **CORS Error**: Check FRONTEND_URL in backend .env
2. **API Key Error**: Verify OpenAI API key in backend .env
3. **Rate Limit**: Wait 15 minutes or adjust limits
4. **Font Upload**: Ensure file is .woff/.woff2/.ttf/.otf

### Development
- Backend logs: Check console output
- Frontend errors: Open browser dev tools
- Network issues: Check browser Network tab

## 📝 License

MIT License - Feel free to use and modify!