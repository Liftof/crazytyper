const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

// Rate limiting - 30 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'CrazyTyper Backend'
    });
});

// OpenAI proxy endpoint
app.post('/api/generate-text', async (req, res) => {
    try {
        const { prompt, pageLength, timeEra } = req.body;

        // Validation
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Invalid prompt provided' 
            });
        }

        if (prompt.length > 2000) {
            return res.status(400).json({ 
                error: 'Prompt too long (max 2000 characters)' 
            });
        }

        // Word count mapping
        const wordCounts = {
            'quarter': 100,
            'half': 200,
            'full': 400,
            'double': 800,
            'triple': 1200,
            'fivepage': 2000,
            'tenpage': 4000,
            'twentypage': 8000,
            'fiftypage': 20000
        };

        const targetWords = wordCounts[pageLength] || 400;

        // Limit max words for cost control
        const maxWords = process.env.MAX_WORDS ? parseInt(process.env.MAX_WORDS) : 10000;
        const actualTargetWords = Math.min(targetWords, maxWords);

        const systemPrompt = `You are a ${timeEra} typewriter operator creating authentic period documents. Write in the style and language appropriate for ${timeEra}. The text should feel genuine and natural for that era, including appropriate vocabulary, expressions, and concerns of the time.

Keep the response to approximately ${actualTargetWords} words. Make it feel like a real document from that era - whether it's a letter, memo, report, or other document type.

Do not add any modern expressions, technology references, or anachronistic elements. Write as if you are actually in ${timeEra}.`;

        // OpenAI API call
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: actualTargetWords > 4000 ? 'gpt-4' : 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: Math.min(actualTargetWords * 1.5, actualTargetWords > 4000 ? 8000 : 4000),
                temperature: 0.8
            })
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json().catch(() => ({}));
            console.error('OpenAI API Error:', openaiResponse.status, errorData);
            
            return res.status(openaiResponse.status === 429 ? 429 : 500).json({
                error: openaiResponse.status === 429 
                    ? 'Rate limit exceeded. Please try again later.'
                    : 'Failed to generate text. Please try again.'
            });
        }

        const data = await openaiResponse.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response from OpenAI');
        }

        res.json({
            text: data.choices[0].message.content.trim(),
            wordCount: data.choices[0].message.content.trim().split(/\s+/).length,
            model: actualTargetWords > 4000 ? 'gpt-4' : 'gpt-3.5-turbo'
        });

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({
            error: 'Internal server error. Please try again later.'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found',
        availableEndpoints: ['/health', '/api/generate-text']
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled Error:', error);
    res.status(500).json({ 
        error: 'Something went wrong!' 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 CrazyTyper Backend running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS enabled for: ${process.env.FRONTEND_URL || 'development origins'}`);
});

module.exports = app;