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
// PDF button removed - using pdfConfigBtn only
const regenerateBtn = document.getElementById('regenerateBtn');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Typewriter imperfection settings
const imperfectionTypes = {
    minimal: {
        typoChance: 0.001,
        fadedChance: 0.005,
        heavyChance: 0.003,
        unevenChance: 0.002,
        spacingChance: 0.002,
        stuckKeyChance: 0.0005
    },
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
document.getElementById('pdfConfigBtn').addEventListener('click', openPdfConfigModal);
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
    let fontSelect, errorLevel;
    
    if (mode === 'generate') {
        fontSelect = document.getElementById('fontSelect');
        errorLevel = document.getElementById('errorLevel').value;
    } else {
        fontSelect = document.getElementById('fontSelectTransform');
        errorLevel = document.getElementById('errorLevelTransform').value;
    }
    
    console.log('displayTypewriterText debug:', {
        mode,
        fontSelectValue: fontSelect.value,
        customFonts,
        hasCustomFontForMode: customFonts[mode]
    });
    
    // Apply font class
    typewriterOutput.className = 'typewriter-output brutal-typewriter font-' + fontSelect.value;
    
    // If custom font is selected, also apply the custom font class
    if (fontSelect.value === 'custom' && customFonts[mode]) {
        typewriterOutput.classList.add('font-custom');
        console.log('Applied custom font class for mode:', mode, customFonts[mode].name);
    }
    
    // Apply typewriter imperfections
    const imperfectedText = applyTypewriterImperfections(text, errorLevel);
    
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

async function exportToPDF(customConfig = null) {
    const outputElement = document.querySelector('.typewriter-output');
    
    if (!outputElement || !outputElement.textContent.trim()) {
        alert('No content to export. Please generate or transform some text first.');
        return;
    }
    
    // Default configuration
    const defaultConfig = {
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        showHeader: true,
        showFooter: true,
        showBranding: false,
        showSeparatorLine: true,
        fontSize: 11,
        lineHeight: 1.6
    };
    
    // Use custom config if provided, otherwise use default - ensure margins exist
    const config = customConfig ? {
        margins: customConfig.margins || defaultConfig.margins,
        showHeader: customConfig.showHeader !== undefined ? customConfig.showHeader : defaultConfig.showHeader,
        showFooter: customConfig.showFooter !== undefined ? customConfig.showFooter : defaultConfig.showFooter,
        showBranding: customConfig.showBranding !== undefined ? customConfig.showBranding : defaultConfig.showBranding,
        showSeparatorLine: customConfig.showSeparatorLine !== undefined ? customConfig.showSeparatorLine : defaultConfig.showSeparatorLine,
        fontSize: customConfig.fontSize || defaultConfig.fontSize,
        lineHeight: customConfig.lineHeight || defaultConfig.lineHeight
    } : defaultConfig;
    
    // Show loading message
    const loadingBtn = document.getElementById('generateCustomPdf');
    showTemporaryMessage(loadingBtn, 'Generating PDF...');
    
    // Parse HTML content to preserve typewriter effects
    const htmlContent = outputElement.innerHTML;
    const parsedContent = parseTypewriterHTML(htmlContent);
    
    // Get current font selection
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    const fontSelect = activeTab === 'generate' 
        ? document.getElementById('fontSelect') 
        : document.getElementById('fontSelectTransform');
    const selectedFont = fontSelect.value;
    
    // Determine which font to use in PDF
    let pdfFont = 'courier'; // default jsPDF font
    let fontName = 'Courier New';
    let customFontData = null;
    
    // Map our font selections to jsPDF compatible fonts
    const fontMap = {
        'courier-prime': { font: 'courier', name: 'Courier Prime' },
        'space-mono': { font: 'courier', name: 'Space Mono (Courier fallback)' },
        'jetbrains-mono': { font: 'courier', name: 'JetBrains Mono (Courier fallback)' },
        'source-code-pro': { font: 'courier', name: 'Source Code Pro (Courier fallback)' },
        'ibm-plex-mono': { font: 'courier', name: 'IBM Plex Mono (Courier fallback)' },
        // Typewriter fonts - use courier as base
        'jmh-typewriter': { font: 'courier', name: 'JMH Typewriter (Courier base)' },
        'jmh-typewriter-black': { font: 'courier', name: 'JMH Typewriter Black (Courier base)' },
        'jmh-typewriter-fine': { font: 'courier', name: 'JMH Typewriter Fine (Courier base)' },
        'elegant-typewriter': { font: 'courier', name: 'Elegant Typewriter (Courier base)' },
        'tt2020-base': { font: 'courier', name: 'TT2020 Base (Courier base)' },
        'tt2020-style-g': { font: 'courier', name: 'TT2020 Style G (Courier base)' },
        'tox-typewriter': { font: 'courier', name: 'Tox Typewriter (Courier base)' },
        'traveling-typewriter': { font: 'courier', name: 'Traveling Typewriter (Courier base)' },
        'gabriele-bad': { font: 'courier', name: 'Gabriele Bad (Courier base)' },
        // Effect variants - Basic
        'jmh-typewriter-cross': { font: 'courier', name: 'JMH Cross Effect (Courier base)' },
        'jmh-typewriter-over': { font: 'courier', name: 'JMH Over Effect (Courier base)' },
        'jmh-typewriter-under': { font: 'courier', name: 'JMH Under Effect (Courier base)' },
        // Black variants with effects
        'jmh-typewriter-black-cross': { font: 'courier', name: 'JMH Black Cross (Courier base)' },
        'jmh-typewriter-black-over': { font: 'courier', name: 'JMH Black Over (Courier base)' },
        'jmh-typewriter-black-under': { font: 'courier', name: 'JMH Black Under (Courier base)' },
        // Fine variants with effects
        'jmh-typewriter-fine-cross': { font: 'courier', name: 'JMH Fine Cross (Courier base)' },
        'jmh-typewriter-fine-over': { font: 'courier', name: 'JMH Fine Over (Courier base)' },
        'jmh-typewriter-fine-under': { font: 'courier', name: 'JMH Fine Under (Courier base)' },
        // Bold variants with effects
        'jmh-typewriter-bold-cross': { font: 'courier', name: 'JMH Bold Cross (Courier base)' },
        'jmh-typewriter-bold-over': { font: 'courier', name: 'JMH Bold Over (Courier base)' },
        'jmh-typewriter-bold-under': { font: 'courier', name: 'JMH Bold Under (Courier base)' }
    };
    
    if (fontMap[selectedFont]) {
        pdfFont = fontMap[selectedFont].font;
        fontName = fontMap[selectedFont].name;
    }
    
    // Try to load custom typewriter font for embedding
    if (selectedFont.includes('jmh-') || selectedFont.includes('elegant-') || 
        selectedFont.includes('tt2020') || selectedFont.includes('tox-') || 
        selectedFont.includes('traveling-') || selectedFont.includes('gabriele-')) {
        customFontData = await loadFontForPDF(selectedFont);
        if (customFontData) {
            fontName = customFontData.name;
        }
    }
    
    try {
        // Create new jsPDF instance - handle different ways jsPDF might be exposed
        let jsPDFClass = null;
        
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDFClass = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDFClass = window.jsPDF;
        } else if (typeof jsPDF !== 'undefined') {
            jsPDFClass = jsPDF;
        } else {
            throw new Error('jsPDF library not found. Please refresh the page.');
        }
        
        const doc = new jsPDFClass({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Add and set custom font if available
        if (customFontData) {
            try {
                doc.addFileToVFS(customFontData.filename, customFontData.base64);
                doc.addFont(customFontData.filename, customFontData.fontName, 'normal');
                doc.setFont(customFontData.fontName);
                console.log('✅ Custom font embedded:', customFontData.fontName);
            } catch (error) {
                console.warn('Failed to embed custom font, using fallback:', error);
                doc.setFont(pdfFont);
            }
        } else {
            doc.setFont(pdfFont);
        }
        doc.setFontSize(config.fontSize);
        
        // Calculate page dimensions with custom margins
        const pageWidth = 210; // A4 width
        const pageHeight = 297; // A4 height
        const contentWidth = pageWidth - config.margins.left - config.margins.right;
        const lineHeight = config.fontSize * config.lineHeight * 0.35; // Convert to mm
        
        let currentY = config.margins.top;
        
        // Add header if enabled
        if (config.showHeader) {
            doc.setFontSize(14);
            doc.text('CrazyTyper Document', config.margins.left, currentY);
            currentY += 10;
            
            doc.setFontSize(8);
            doc.text(`Font: ${fontName}`, config.margins.left, currentY);
            currentY += 5;
            doc.text(`Generated: ${new Date().toLocaleString()}`, config.margins.left, currentY);
            currentY += 8;
            
            // Add separator line if enabled
            if (config.showSeparatorLine) {
                doc.line(config.margins.left, currentY, pageWidth - config.margins.right, currentY);
                currentY += 8;
            }
        }
        
        // Reset font size for content
        doc.setFontSize(config.fontSize);
        
        // Render content with typewriter effects
        currentY = renderTypewriterContent(doc, parsedContent, config, currentY, pageHeight, contentWidth, lineHeight);
        
        // Add footer if enabled
        if (config.showFooter || config.showBranding) {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                
                const footerY = pageHeight - config.margins.bottom + 5;
                
                if (config.showFooter) {
                    doc.text(`Page ${i} of ${pageCount}`, config.margins.left, footerY);
                }
                
                if (config.showBranding) {
                    const brandingText = 'Generated with CrazyTyper';
                    if (config.showFooter) {
                        doc.text(` - ${brandingText}`, config.margins.left + 40, footerY);
                    } else {
                        doc.text(brandingText, config.margins.left, footerY);
                    }
                }
            }
        }
        
        // Save the PDF
        const filename = `crazytyper-${new Date().getTime()}.pdf`;
        doc.save(filename);
        
        // Show success message
        showTemporaryMessage(loadingBtn, 'PDF Downloaded!');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            jsPDFAvailable: {
                'window.jspdf': typeof window.jspdf,
                'window.jsPDF': typeof window.jsPDF,
                'global jsPDF': typeof jsPDF
            }
        });
        showTemporaryMessage(loadingBtn, 'PDF Error - Try Again');
        console.error('PDF Generation Error:', error);
        
        let userMessage = 'Failed to generate PDF. ';
        if (error.message.includes('jsPDF')) {
            userMessage += 'PDF library not loaded properly. Please refresh the page and try again.';
        } else if (error.message.includes('Font')) {
            userMessage += 'Font loading failed. The PDF will use a default font.';
        } else {
            userMessage += 'Please try again or contact support if the problem persists.';
        }
        
        showError(userMessage);
    }
}

function showTemporaryMessage(element, message) {
    if (!element) {
        console.warn('showTemporaryMessage: Element is null, message was:', message);
        return;
    }
    
    const originalText = element.textContent;
    const wasDisabled = element.disabled;
    
    element.textContent = message;
    if ('disabled' in element) {
        element.disabled = true;
    }
    
    setTimeout(() => {
        element.textContent = originalText;
        if ('disabled' in element) {
            element.disabled = wasDisabled;
        }
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
            
            // Store font info including the data for PDF export
            customFonts[mode] = {
                name: fontName,
                family: fontName,
                data: fontData,
                fontFace: loadedFont
            };
            
            console.log('Custom font stored for mode:', mode, {
                name: fontName,
                dataSize: fontData.byteLength,
                mode: mode,
                customFonts
            });
            
            // Create CSS rule for the font
            const style = document.createElement('style');
            style.textContent = `
                .font-custom {
                    font-family: '${fontName}', monospace !important;
                }
            `;
            document.head.appendChild(style);
            
            // CRITICAL FIX: Automatically select "custom" in the font dropdown
            const fontSelectId = mode === 'generate' ? 'fontSelect' : 'fontSelectTransform';
            const fontSelect = document.getElementById(fontSelectId);
            fontSelect.value = 'custom';
            console.log('Auto-selected "custom" font for mode:', mode);
            
            // Find the label near the file input for feedback
            const fileInput = mode === 'generate' 
                ? document.getElementById('customFontUpload')
                : document.getElementById('customFontUploadTransform');
            const label = fileInput ? fileInput.closest('.input-group').querySelector('label') : null;
            
            if (label) {
                showTemporaryMessage(label, 'Font loaded successfully!');
            } else {
                console.log('Font loaded successfully:', fontName);
            }
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

// PDF CONFIGURATION MODAL FUNCTIONS
let modalEventListenersAdded = false;

function openPdfConfigModal() {
    const modal = document.getElementById('pdfConfigModal');
    modal.classList.remove('hidden');
    
    // Add event listeners only once
    if (!modalEventListenersAdded) {
        document.getElementById('closePdfModal').addEventListener('click', closePdfConfigModal);
        document.getElementById('cancelPdfConfig').addEventListener('click', closePdfConfigModal);
        document.getElementById('resetPdfConfig').addEventListener('click', resetPdfConfig);
        document.getElementById('generateCustomPdf').addEventListener('click', generateCustomPDF);
        
        // Close modal on background click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePdfConfigModal();
            }
        });
        
        modalEventListenersAdded = true;
    }
}

function closePdfConfigModal() {
    const modal = document.getElementById('pdfConfigModal');
    modal.classList.add('hidden');
}

function resetPdfConfig() {
    document.getElementById('marginTop').value = 20;
    document.getElementById('marginBottom').value = 20;
    document.getElementById('marginLeft').value = 20;
    document.getElementById('marginRight').value = 20;
    document.getElementById('showHeader').checked = false;
    document.getElementById('showFooter').checked = false;
    document.getElementById('showBranding').checked = false;
    document.getElementById('showSeparatorLine').checked = true;
    document.getElementById('fontSize').value = '11';
    document.getElementById('lineHeight').value = '1.6';
}

function getPdfConfig() {
    return {
        margins: {
            top: parseInt(document.getElementById('marginTop').value) || 20,
            bottom: parseInt(document.getElementById('marginBottom').value) || 20,
            left: parseInt(document.getElementById('marginLeft').value) || 20,
            right: parseInt(document.getElementById('marginRight').value) || 20
        },
        showHeader: document.getElementById('showHeader').checked,
        showFooter: document.getElementById('showFooter').checked,
        showBranding: document.getElementById('showBranding').checked,
        showSeparatorLine: document.getElementById('showSeparatorLine').checked,
        fontSize: parseInt(document.getElementById('fontSize').value) || 11,
        lineHeight: parseFloat(document.getElementById('lineHeight').value) || 1.6
    };
}

async function generateCustomPDF() {
    const config = getPdfConfig();
    await exportToPDF(config);
    closePdfConfigModal();
}

// Font loading for PDF embedding
async function loadFontForPDF(selectedFont) {
    const fontMapping = {
        'jmh-typewriter': 'JMH Typewriter mono.ttf',
        'jmh-typewriter-black': 'JMH Typewriter mono Black.ttf',
        'jmh-typewriter-fine': 'JMH Typewriter mono Fine.ttf',
        'jmh-typewriter-cross': 'JMH Typewriter mono Cross.ttf',
        'jmh-typewriter-over': 'JMH Typewriter mono Over.ttf',
        'jmh-typewriter-under': 'JMH Typewriter mono Under.ttf',
        'jmh-typewriter-black-cross': 'JMH Typewriter mono Black Cross.ttf',
        'jmh-typewriter-black-over': 'JMH Typewriter mono Black Over.ttf',
        'jmh-typewriter-black-under': 'JMH Typewriter mono Black Under.ttf',
        'jmh-typewriter-fine-cross': 'JMH Typewriter mono Fine Cross.ttf',
        'jmh-typewriter-fine-over': 'JMH Typewriter mono Fine Over.ttf',
        'jmh-typewriter-fine-under': 'JMH Typewriter mono Fine Under.ttf',
        'jmh-typewriter-bold-cross': 'JMH Typewriter mono Bold Cross.ttf',
        'jmh-typewriter-bold-over': 'JMH Typewriter mono Bold Over.ttf',
        'jmh-typewriter-bold-under': 'JMH Typewriter mono Bold Under.ttf',
        'elegant-typewriter': 'ELEGANT TYPEWRITER Light.ttf',
        'tt2020-base': 'TT2020Base-Regular.ttf',
        'tt2020-style-g': 'TT2020StyleG-Regular-ASCII.ttf',
        'tox-typewriter': 'Tox Typewriter.ttf',
        'traveling-typewriter': 'TravelingTypewriter.ttf',
        'gabriele-bad': 'gabriele-bad.ttf'
    };
    
    const fontFilename = fontMapping[selectedFont];
    if (!fontFilename) {
        console.warn('Font mapping not found for:', selectedFont);
        return null;
    }
    
    try {
        console.log('🔄 Loading font for PDF:', fontFilename);
        const response = await fetch(`./fonts/${fontFilename}`);
        if (!response.ok) {
            throw new Error(`Font file not found: ${fontFilename}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64 in chunks to avoid memory issues
        let base64 = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            base64 += String.fromCharCode.apply(null, chunk);
        }
        const base64Font = btoa(base64);
        
        console.log('✅ Font loaded and converted to base64:', fontFilename);
        
        return {
            filename: fontFilename,
            fontName: selectedFont.replace(/-/g, '_'), // jsPDF font names can't have dashes
            base64: base64Font,
            name: fontFilename.replace('.ttf', '')
        };
    } catch (error) {
        console.error('❌ Failed to load font:', fontFilename, error);
        return null;
    }
}

// Parse HTML content to extract typewriter effects
function parseTypewriterHTML(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const result = [];
    
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Plain text - split into characters
            const text = node.textContent || '';
            for (const char of text) {
                result.push({
                    char: char,
                    effects: []
                });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Element with potential effects
            const effects = [];
            
            // Extract typewriter effect classes
            if (node.classList.contains('char-faded')) effects.push('faded');
            if (node.classList.contains('char-heavy')) effects.push('heavy'); 
            if (node.classList.contains('char-light')) effects.push('light');
            if (node.classList.contains('char-uneven')) effects.push('uneven-up');
            if (node.classList.contains('char-uneven-down')) effects.push('uneven-down');
            if (node.classList.contains('char-spaced')) effects.push('spaced');
            if (node.classList.contains('char-tight')) effects.push('tight');
            
            // Process text content of this element
            const text = node.textContent || '';
            for (const char of text) {
                result.push({
                    char: char,
                    effects: [...effects]
                });
            }
        }
    }
    
    // Process all child nodes
    tempDiv.childNodes.forEach(processNode);
    
    console.log('📝 Parsed', result.length, 'characters with effects');
    return result;
}

// Render content with typewriter effects in PDF
function renderTypewriterContent(doc, parsedContent, config, startY, pageHeight, contentWidth, baseLineHeight) {
    let currentY = startY;
    let currentX = config.margins.left;
    const charWidth = config.fontSize * 0.6; // Approximate character width in mm
    
    // Split into paragraphs by detecting double line breaks
    const paragraphs = [];
    let currentParagraph = [];
    
    for (let i = 0; i < parsedContent.length; i++) {
        const item = parsedContent[i];
        
        if (item.char === '\n') {
            // Check if next char is also newline (paragraph break)
            if (i + 1 < parsedContent.length && parsedContent[i + 1].char === '\n') {
                // End current paragraph
                if (currentParagraph.length > 0) {
                    paragraphs.push([...currentParagraph]);
                    currentParagraph = [];
                }
                i++; // Skip the second newline
            } else {
                // Single line break within paragraph
                currentParagraph.push({ char: ' ', effects: [] }); // Convert to space
            }
        } else {
            currentParagraph.push(item);
        }
    }
    
    // Add final paragraph if any
    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
    }
    
    // Render each paragraph
    paragraphs.forEach((paragraph, pIndex) => {
        if (paragraph.length === 0) return;
        
        // Wrap text to fit page width
        const lines = wrapTextWithEffects(paragraph, contentWidth, charWidth);
        
        lines.forEach((line, lIndex) => {
            // Check if we need a new page
            if (currentY + baseLineHeight > pageHeight - config.margins.bottom) {
                doc.addPage();
                currentY = config.margins.top;
            }
            
            currentX = config.margins.left;
            
            // Render each character with its effects
            line.forEach(item => {
                if (item.char !== ' ') { // Render non-space characters
                    renderCharacterWithEffects(doc, item.char, item.effects, currentX, currentY, config.fontSize);
                }
                // Always advance position (including for spaces)
                currentX += charWidth + getExtraSpacing(item.effects);
            });
            
            currentY += baseLineHeight;
        });
        
        // Add paragraph spacing
        if (pIndex < paragraphs.length - 1) {
            currentY += baseLineHeight * 0.5;
        }
    });
    
    return currentY;
}

// Helper function to wrap text considering effects
function wrapTextWithEffects(paragraph, maxWidth, charWidth) {
    const lines = [];
    let currentLine = [];
    let currentWidth = 0;
    
    paragraph.forEach(item => {
        const itemWidth = charWidth + getExtraSpacing(item.effects);
        
        if (currentWidth + itemWidth > maxWidth && currentLine.length > 0) {
            // Start new line
            lines.push([...currentLine]);
            currentLine = [item];
            currentWidth = itemWidth;
        } else {
            currentLine.push(item);
            currentWidth += itemWidth;
        }
    });
    
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    
    return lines;
}

// Helper function to get extra spacing for effects
function getExtraSpacing(effects) {
    if (effects.includes('spaced')) return 1;
    if (effects.includes('tight')) return -0.5;
    return 0;
}

// Render individual character with effects
function renderCharacterWithEffects(doc, char, effects, x, y, fontSize) {
    // Apply color/opacity effects
    let textColor = [0, 0, 0]; // Default black
    
    if (effects.includes('faded')) {
        textColor = [128, 128, 128]; // Gray for faded
    } else if (effects.includes('heavy')) {
        // For heavy effect, we'll render the character multiple times slightly offset
        doc.setTextColor(0, 0, 0);
        doc.text(char, x, y);
        doc.text(char, x + 0.1, y); // Slight offset for bold effect
        return;
    } else if (effects.includes('light')) {
        textColor = [180, 180, 180]; // Light gray
    }
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    // Apply position effects
    let adjustedY = y;
    if (effects.includes('uneven-up')) {
        adjustedY -= 0.5;
    } else if (effects.includes('uneven-down')) {
        adjustedY += 0.5;
    }
    
    // Render the character
    doc.text(char, x, adjustedY);
    
    // Reset color to black for next character
    doc.setTextColor(0, 0, 0);
}