// Backend API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : 'https://crazytyper.onrender.com';

// DOM Elements
const generateForm = document.getElementById('textGeneratorForm');
const transformForm = document.getElementById('textTransformForm');
const generateBtn = document.getElementById('generateBtn');
const transformBtn = document.getElementById('transformBtn');
const btnText = document.getElementById('btnText');
const btnLoading = document.getElementById('btnLoading');
const transformBtnText = document.getElementById('transformBtnText');
const transformBtnLoading = document.getElementById('transformBtnLoading');
const outputSection = document.getElementById('outputSection');
const typewriterOutput = document.getElementById('typewriterOutput');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const copyBtn = document.getElementById('copyBtn');
const printBtn = document.getElementById('printBtn');
const pdfBtn = document.getElementById('pdfBtn');
const regenerateBtn = document.getElementById('regenerateBtn');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Typewriter imperfection settings
const imperfectionTypes = {
    light: {
        typoChance: 0.005,
        fadedChance: 0.02,
        heavyChance: 0.01,
        unevenChance: 0.015,
        spacingChance: 0.01,
        stuckKeyChance: 0.002
    },
    medium: {
        typoChance: 0.01,
        fadedChance: 0.04,
        heavyChance: 0.025,
        unevenChance: 0.03,
        spacingChance: 0.02,
        stuckKeyChance: 0.005
    },
    heavy: {
        typoChance: 0.02,
        fadedChance: 0.06,
        heavyChance: 0.04,
        unevenChance: 0.05,
        spacingChance: 0.035,
        stuckKeyChance: 0.01
    }
};

// Common typewriter typos and character substitutions
const commonTypos = {
    'e': ['3', 'r', 'w'],
    'r': ['t', 'e', 'f'],
    't': ['y', 'r', 'g'],
    'y': ['t', 'u', 'h'],
    'u': ['i', 'y', 'j'],
    'i': ['o', 'u', 'k'],
    'o': ['p', 'i', 'l'],
    'p': ['o', 'l', ';'],
    'a': ['s', 'q'],
    's': ['d', 'a', 'w'],
    'd': ['f', 's', 'e'],
    'f': ['g', 'd', 'r'],
    'g': ['h', 'f', 't'],
    'h': ['j', 'g', 'y'],
    'j': ['k', 'h', 'u'],
    'k': ['l', 'j', 'i'],
    'l': ['k', 'o', ';'],
    'z': ['x', 'a'],
    'x': ['c', 'z', 's'],
    'c': ['v', 'x', 'd'],
    'v': ['b', 'c', 'f'],
    'b': ['n', 'v', 'g'],
    'n': ['m', 'b', 'h'],
    'm': ['n', 'j']
};

// Words that might get stuck keys (repeated letters)
const stuckKeyWords = ['the', 'and', 'that', 'with', 'have', 'this', 'will', 'your', 'from', 'they'];

// Request management
let currentController = null;

// Event listeners
generateForm.addEventListener('submit', handleGenerateSubmit);
transformForm.addEventListener('submit', handleTransformSubmit);
copyBtn.addEventListener('click', copyToClipboard);
printBtn.addEventListener('click', printDocument);
pdfBtn.addEventListener('click', exportToPDF);
regenerateBtn.addEventListener('click', regenerateText);

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
});

// Initialize tabs
switchTab('generate');

// Custom font management
let customFonts = {};

// Font select change handlers
document.getElementById('fontSelect').addEventListener('change', handleFontSelectChange);
document.getElementById('fontSelectTransform').addEventListener('change', handleFontSelectChangeTransform);

// Length select change handler
document.getElementById('pageLength').addEventListener('change', handleLengthSelectChange);

// Custom font upload handlers
document.getElementById('customFontUpload').addEventListener('change', handleCustomFontUpload);
document.getElementById('customFontUploadTransform').addEventListener('change', handleCustomFontUploadTransform);

// Tab switching function
function switchTab(tabName) {
    // Update tab buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName + 'Tab') {
            content.classList.add('active');
        }
    });
}

async function handleGenerateSubmit(e) {
    e.preventDefault();
    
    const prompt = document.getElementById('textPrompt').value;
    const pageLength = document.getElementById('pageLength').value;
    const timeEra = document.getElementById('timeEra').value;
    
    if (!prompt.trim()) {
        showError('Please describe what the text should be about.');
        return;
    }
    
    setLoading('generate', true);
    hideError();
    hideOutput();
    
    try {
        const generatedText = await generateText(prompt, pageLength, timeEra);
        displayTypewriterText(generatedText, 'generate');
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request was cancelled');
            return; // Don't show error for cancelled requests
        }
        console.error('Error generating text:', error);
        showError('Failed to generate text. Please check your API key and try again.');
    } finally {
        setLoading('generate', false);
    }
}

async function handleTransformSubmit(e) {
    e.preventDefault();
    
    const userText = document.getElementById('userText').value;
    
    if (!userText.trim()) {
        showError('Please paste or type some text to transform.');
        return;
    }
    
    setLoading('transform', true);
    hideError();
    hideOutput();
    
    try {
        displayTypewriterText(userText, 'transform');
    } catch (error) {
        console.error('Error transforming text:', error);
        showError('Failed to transform text. Please try again.');
    } finally {
        setLoading('transform', false);
    }
}

async function generateText(prompt, pageLength, timeEra) {
    // Cancel previous request if any
    if (currentController) {
        currentController.abort();
    }
    
    // Create new AbortController for this request
    currentController = new AbortController();
    
    // Handle custom word count
    if (pageLength === 'custom') {
        const customWordCount = document.getElementById('customWordCount').value;
        if (!customWordCount || customWordCount < 50) {
            throw new Error('Please enter a valid word count (minimum 50)');
        }
    }

    const response = await fetch(`${API_BASE_URL}/api/generate-text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: prompt.trim(),
            pageLength: pageLength,
            timeEra: timeEra
        }),
        signal: currentController.signal
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
            throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (response.status === 400) {
            throw new Error(errorData.error || 'Invalid request. Please check your input.');
        } else if (response.status >= 500) {
            throw new Error('Server error. Please try again later.');
        } else {
            throw new Error(`API error: ${response.status}`);
        }
    }

    const data = await response.json();
    return data.text;
}

function displayTypewriterText(text, mode) {
    let fontSelect, imperfectionLevel;
    
    if (mode === 'generate') {
        fontSelect = document.getElementById('fontSelect');
        imperfectionLevel = document.getElementById('imperfectionLevel').value;
    } else {
        fontSelect = document.getElementById('fontSelectTransform');
        imperfectionLevel = document.getElementById('imperfectionLevelTransform').value;
    }
    
    // Apply font class
    typewriterOutput.className = 'typewriter-output brutal-typewriter font-' + fontSelect.value;
    
    // Apply typewriter imperfections
    const imperfectedText = applyTypewriterImperfections(text, imperfectionLevel);
    
    // Display the text with a typing animation
    animateTyping(imperfectedText);
    
    showOutput();
}

function applyTypewriterImperfections(text, level) {
    const settings = imperfectionTypes[level];
    let result = '';
    const words = text.split(/(\s+)/);
    
    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        const word = words[wordIndex];
        
        // Skip whitespace
        if (/^\s+$/.test(word)) {
            result += word;
            continue;
        }
        
        let processedWord = '';
        
        // Check for stuck key (repeat a word occasionally)
        if (Math.random() < settings.stuckKeyChance && stuckKeyWords.includes(word.toLowerCase())) {
            processedWord += word + word; // Repeat the word
        } else {
            // Process each character
            for (let i = 0; i < word.length; i++) {
                let char = word[i];
                
                // Apply typos
                if (Math.random() < settings.typoChance && commonTypos[char.toLowerCase()]) {
                    const typos = commonTypos[char.toLowerCase()];
                    char = typos[Math.floor(Math.random() * typos.length)];
                    if (word[i] === word[i].toUpperCase() && char !== char.toUpperCase()) {
                        char = char.toUpperCase();
                    }
                }
                
                // Wrap character with imperfection classes
                let classes = [];
                
                if (Math.random() < settings.fadedChance) {
                    classes.push('char-faded');
                }
                
                if (Math.random() < settings.heavyChance) {
                    classes.push('char-heavy');
                }
                
                if (Math.random() < settings.unevenChance) {
                    classes.push(Math.random() < 0.5 ? 'char-uneven' : 'char-uneven-down');
                }
                
                if (Math.random() < settings.spacingChance) {
                    classes.push(Math.random() < 0.5 ? 'char-spaced' : 'char-tight');
                }
                
                if (classes.length > 0) {
                    processedWord += `<span class="${classes.join(' ')}">${char}</span>`;
                } else {
                    processedWord += char;
                }
            }
        }
        
        result += processedWord;
    }
    
    return result;
}

function animateTyping(text) {
    const optimization = optimizeTextProcessing(text);
    
    if (!optimization.animate) {
        // For very large texts, skip animation
        typewriterOutput.innerHTML = text;
        return;
    }
    
    typewriterOutput.innerHTML = '';
    let index = 0;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const characters = Array.from(tempDiv.childNodes).flatMap(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            return Array.from(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            return [node.outerHTML];
        }
        return [];
    });
    
    function typeNextChar() {
        if (index < characters.length) {
            const char = characters[index];
            if (char.startsWith('<span')) {
                typewriterOutput.innerHTML += char;
            } else {
                typewriterOutput.innerHTML += char;
            }
            index++;
            
            // Vary typing speed based on optimization level
            const baseDelay = optimization.animationSpeed || 30;
            const delay = Math.random() * baseDelay + (baseDelay * 0.3);
            setTimeout(typeNextChar, delay);
        }
    }
    
    typeNextChar();
}

async function regenerateText() {
    // Determine which tab is active
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (activeTab === 'generate') {
        const prompt = document.getElementById('textPrompt').value;
        const pageLength = document.getElementById('pageLength').value;
        const timeEra = document.getElementById('timeEra').value;
        
        if (!prompt.trim()) {
            showError('Please enter a prompt first.');
            return;
        }
        
        setLoading('generate', true);
        hideError();
        
        try {
            const generatedText = await generateText(prompt, pageLength, timeEra);
            displayTypewriterText(generatedText, 'generate');
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was cancelled');
                return; // Don't show error for cancelled requests
            }
            console.error('Error regenerating text:', error);
            showError('Failed to regenerate text. Please try again.');
        } finally {
            setLoading('generate', false);
        }
    } else {
        const userText = document.getElementById('userText').value;
        
        if (!userText.trim()) {
            showError('Please enter some text first.');
            return;
        }
        
        setLoading('transform', true);
        hideError();
        
        try {
            displayTypewriterText(userText, 'transform');
        } catch (error) {
            console.error('Error retransforming text:', error);
            showError('Failed to retransform text. Please try again.');
        } finally {
            setLoading('transform', false);
        }
    }
}

function copyToClipboard() {
    const textToCopy = typewriterOutput.innerText || typewriterOutput.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showTemporaryMessage(copyBtn, 'Copied!');
        }).catch(() => {
            fallbackCopyToClipboard(textToCopy);
        });
    } else {
        fallbackCopyToClipboard(textToCopy);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showTemporaryMessage(copyBtn, 'Copied!');
    } catch (err) {
        showTemporaryMessage(copyBtn, 'Copy failed');
    }
    
    document.body.removeChild(textArea);
}

function printDocument() {
    // Ensure the output is visible and ready for printing
    const outputElement = document.querySelector('.typewriter-output');
    
    if (!outputElement || !outputElement.textContent.trim()) {
        alert('No content to print. Please generate or transform some text first.');
        return;
    }
    
    // Add a small delay to ensure styles are applied
    setTimeout(() => {
        window.print();
    }, 100);
}

function exportToPDF() {
    const outputElement = document.querySelector('.typewriter-output');
    
    if (!outputElement || !outputElement.textContent.trim()) {
        alert('No content to export. Please generate or transform some text first.');
        return;
    }
    
    // Create a new window with clean content for PDF export
    const printWindow = window.open('', '_blank');
    const textContent = outputElement.textContent;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>CrazyTyper Export</title>
            <style>
                @page {
                    size: A4;
                    margin: 1in 1.25in;
                }
                
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 11pt;
                    line-height: 1.6;
                    color: #1a1a1a;
                    background: white;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
                
                .content {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    page-break-inside: avoid;
                    orphans: 3;
                    widows: 3;
                }
                
                @media print {
                    body { print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="content">${textContent}</div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Close the window after printing
        setTimeout(() => {
            printWindow.close();
        }, 1000);
    }, 500);
}

function showTemporaryMessage(button, message) {
    const originalText = button.textContent;
    button.textContent = message;
    button.disabled = true;
    
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 2000);
}

function setLoading(mode, loading) {
    if (mode === 'generate') {
        generateBtn.disabled = loading;
        if (loading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    } else if (mode === 'transform') {
        transformBtn.disabled = loading;
        if (loading) {
            transformBtnText.classList.add('hidden');
            transformBtnLoading.classList.remove('hidden');
        } else {
            transformBtnText.classList.remove('hidden');
            transformBtnLoading.classList.add('hidden');
        }
    }
}

function showOutput() {
    outputSection.classList.remove('hidden');
}

function hideOutput() {
    outputSection.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
}

function hideError() {
    errorSection.classList.add('hidden');
}

// Font selection handlers
function handleFontSelectChange(e) {
    const customGroup = document.getElementById('customFontGroup');
    if (e.target.value === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

function handleFontSelectChangeTransform(e) {
    const customGroup = document.getElementById('customFontGroupTransform');
    if (e.target.value === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

function handleLengthSelectChange(e) {
    const customGroup = document.getElementById('customWordCountGroup');
    if (e.target.value === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

// Custom font upload handlers
function handleCustomFontUpload(e) {
    const file = e.target.files[0];
    if (file) {
        loadCustomFont(file, 'generate');
    }
}

function handleCustomFontUploadTransform(e) {
    const file = e.target.files[0];
    if (file) {
        loadCustomFont(file, 'transform');
    }
}

function loadCustomFont(file, mode) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const fontData = e.target.result;
        const fontName = 'custom-font-' + Date.now();
        
        // Create font face
        const fontFace = new FontFace(fontName, fontData);
        
        fontFace.load().then(function(loadedFont) {
            // Add font to document
            document.fonts.add(loadedFont);
            
            // Store font info
            customFonts[mode] = {
                name: fontName,
                family: fontName
            };
            
            // Create CSS rule for the font
            const style = document.createElement('style');
            style.textContent = `
                .font-custom {
                    font-family: '${fontName}', monospace !important;
                }
            `;
            document.head.appendChild(style);
            
            showTemporaryMessage(
                mode === 'generate' 
                    ? document.querySelector('label[for="customFontUpload"]')
                    : document.querySelector('label[for="customFontUploadTransform"]'),
                'Font loaded successfully!'
            );
        }).catch(function(error) {
            console.error('Error loading custom font:', error);
            showError('Failed to load custom font. Please try a different file.');
        });
    };
    
    reader.readAsArrayBuffer(file);
}

// Optimize text processing for large documents
function optimizeTextProcessing(text, level) {
    // For very large texts, reduce animation and processing intensity
    const textLength = text.length;
    
    if (textLength > 10000) {
        // Disable typing animation for very large texts
        return {
            animate: false,
            batchSize: 1000,
            processInChunks: true
        };
    } else if (textLength > 5000) {
        return {
            animate: true,
            batchSize: 500,
            processInChunks: true,
            animationSpeed: 1 // Faster animation
        };
    } else {
        return {
            animate: true,
            batchSize: 100,
            processInChunks: false,
            animationSpeed: 30 // Normal speed
        };
    }
}